/**
 * Quantum Therapy — Binaural / Isochronic Audio Engine
 *
 * Architecture notes (carried forward from the original build, do not "simplify"):
 *
 *  1. ONE global AudioContext for the whole app lifetime. Created on the first
 *     user gesture, resumed thereafter, never closed. iOS punishes churn.
 *
 *  2. Playback uses a PRE-RENDERED STEREO AudioBuffer, not a ChannelMergerNode.
 *     ChannelMergerNode silently outputs nothing on Safari/iOS. This is the single
 *     most important decision in this file. The WAV export always worked in the old
 *     app precisely because it took this path.
 *
 *  3. The buffer is generated at an integer number of cycles for BOTH channels so
 *     the loop point is phase-continuous. No clicks, no drift over a 30 min session.
 *
 *  4. Frequencies at or above BINAURAL_MAX_HZ cannot be delivered binaurally
 *     (the beat would exceed the audible carrier). Those switch to isochronic
 *     amplitude gating of the carrier instead.
 */

export const CARRIER_HZ = 200;
export const BINAURAL_MAX_HZ = 1500;
export const LOOP_SECONDS = 4;
const FADE_SECONDS = 0.04;

export type DeliveryMode = "binaural" | "isochronic";

let ctx: AudioContext | null = null;

/**
 * Safari reports a non-standard "interrupted" state (phone call, Siri, another
 * app grabbing the audio session, or the screen locking). It is NOT "suspended",
 * so any code that only checks for "suspended" will never recover from it.
 */
export type EngineState = AudioContextState | "interrupted";

export function engineState(): EngineState | "none" {
  return ctx ? (ctx.state as EngineState) : "none";
}

/** True when the engine is not actually producing output. */
export function engineBlocked(): boolean {
  return !!ctx && ctx.state !== "running";
}

let watching = false;

/**
 * Keep the context alive across iOS interruptions. Once the interruption ends
 * (call over, app back in the foreground) resume() succeeds without a gesture.
 */
function watchContext(c: AudioContext) {
  if (watching) return;
  watching = true;

  const tryResume = () => {
    if (c.state !== "running") {
      c.resume().catch(() => {
        /* needs a gesture; the next Play tap handles it */
      });
    }
  };

  c.addEventListener("statechange", () => {
    if ((c.state as EngineState) === "interrupted") {
      // Give iOS a beat to release the session, then ask for it back.
      setTimeout(tryResume, 300);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryResume();
  });
  window.addEventListener("pageshow", tryResume);
  window.addEventListener("focus", tryResume);
}

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor({ latencyHint: "playback" });
    watchContext(ctx);
  }
  return ctx;
}

export const BLOCKED_NOTICE =
  "Your phone blocked the audio engine. Tap play once more. If the side switch is on silent, flip it, then tap play.";

/**
 * A short while after starting, confirm the engine is really running. iOS can
 * accept the start() call and then hand the audio session to something else.
 */
export function verifyEngineAfter(ms: number, onResult: (blocked: boolean) => void): void {
  setTimeout(() => onResult(engineBlocked()), ms);
}

/** Call this INSIDE the user gesture handler, before any async work. */
export async function preWarm(): Promise<AudioContext> {
  const c = getAudioContext();
  // Anything other than "running" (suspended OR interrupted) needs a resume.
  if (c.state !== "running") {
    try {
      await c.resume();
    } catch {
      /* resumed later on next gesture */
    }
  }
  return c;
}

export function deliveryModeFor(hz: number): DeliveryMode {
  return hz < BINAURAL_MAX_HZ ? "binaural" : "isochronic";
}

/**
 * Snap a duration to a whole number of cycles for a given frequency so the
 * rendered buffer loops seamlessly.
 */
function seamlessDuration(target: number, ...freqs: number[]): number {
  let d = target;
  for (const f of freqs) {
    if (f <= 0) continue;
    const cycles = Math.max(1, Math.round(d * f));
    d = cycles / f;
  }
  return d;
}

/**
 * Render one loopable stereo buffer for a target therapeutic frequency.
 *
 * binaural:   L = carrier,  R = carrier + hz   -> brain perceives the difference
 * isochronic: both channels = carrier, gated on/off at hz
 */
export function renderBuffer(
  audioCtx: BaseAudioContext,
  hz: number,
  opts: { carrier?: number; seconds?: number; amplitude?: number } = {},
): AudioBuffer {
  const carrier = opts.carrier ?? CARRIER_HZ;
  const amp = opts.amplitude ?? 0.28;
  const mode = deliveryModeFor(hz);
  const rate = audioCtx.sampleRate;

  const seconds =
    mode === "binaural"
      ? seamlessDuration(opts.seconds ?? LOOP_SECONDS, carrier, carrier + hz)
      : seamlessDuration(opts.seconds ?? LOOP_SECONDS, carrier, hz);

  const frames = Math.max(1, Math.floor(seconds * rate));
  const buffer = audioCtx.createBuffer(2, frames, rate);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);

  const TAU = Math.PI * 2;

  if (mode === "binaural") {
    const wL = (TAU * carrier) / rate;
    const wR = (TAU * (carrier + hz)) / rate;
    for (let i = 0; i < frames; i++) {
      L[i] = Math.sin(wL * i) * amp;
      R[i] = Math.sin(wR * i) * amp;
    }
  } else {
    // Isochronic: hard-edged pulses are harsh, so use a raised-cosine envelope.
    const wC = (TAU * carrier) / rate;
    const wG = (TAU * hz) / rate;
    for (let i = 0; i < frames; i++) {
      const gate = 0.5 * (1 - Math.cos(wG * i)); // 0..1, no DC click
      const s = Math.sin(wC * i) * gate * amp;
      L[i] = s;
      R[i] = s;
    }
  }

  return buffer;
}

/** One playing frequency: source -> gain -> destination. */
type Voice = { source: AudioBufferSourceNode; gain: GainNode };

export type PlayerState = {
  isPlaying: boolean;
  index: number;
  frequency: number | null;
  mode: DeliveryMode | null;
  elapsedInStep: number;
  stepDuration: number;
  totalElapsed: number;
  totalDuration: number;
  phase: PhaseName;
};

export type PhaseName = "grounding" | "protocol" | "clearing" | "lockin" | "complete";

export const PHASE_FREQUENCIES: Record<Exclude<PhaseName, "protocol" | "complete">, number> = {
  grounding: 7.83, // Schumann resonance
  clearing: 10000, // broad-spectrum sweep tone
  lockin: 62.4, // integration
};

export type SessionOptions = {
  frequencies: number[];
  /** seconds per frequency */
  stepSeconds?: number;
  volume?: number;
  carrier?: number;
  grounding?: boolean;
  clearing?: boolean;
  lockIn?: boolean;
  /** seconds for each optional phase */
  phaseSeconds?: number;
};

export class SessionPlayer {
  private ctx: AudioContext;
  private master: GainNode;
  private voice: Voice | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  private queue: { hz: number; seconds: number; phase: PhaseName }[] = [];
  private idx = 0;
  private stepStartedAt = 0;
  private pausedOffset = 0;
  private running = false;

  public onUpdate: ((s: PlayerState) => void) | null = null;
  public onComplete: (() => void) | null = null;

  constructor(private opts: SessionOptions) {
    this.ctx = getAudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = opts.volume ?? 0.75;
    this.master.connect(this.ctx.destination);
    this.buildQueue();
  }

  private buildQueue() {
    const step = this.opts.stepSeconds ?? 180;
    const phase = this.opts.phaseSeconds ?? 120;
    const q: { hz: number; seconds: number; phase: PhaseName }[] = [];

    if (this.opts.grounding)
      q.push({ hz: PHASE_FREQUENCIES.grounding, seconds: phase, phase: "grounding" });

    for (const hz of this.opts.frequencies) q.push({ hz, seconds: step, phase: "protocol" });

    if (this.opts.clearing)
      q.push({ hz: PHASE_FREQUENCIES.clearing, seconds: phase, phase: "clearing" });
    if (this.opts.lockIn)
      q.push({ hz: PHASE_FREQUENCIES.lockin, seconds: phase, phase: "lockin" });

    this.queue = q;
  }

  get totalDuration() {
    return this.queue.reduce((a, s) => a + s.seconds, 0);
  }

  private elapsedBefore(i: number) {
    return this.queue.slice(0, i).reduce((a, s) => a + s.seconds, 0);
  }

  setVolume(v: number) {
    this.opts.volume = v;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** Must be called from within a user gesture the first time. */
  async start() {
    await preWarm();
    this.idx = 0;
    this.pausedOffset = 0;
    this.running = true;
    this.playStep();
    this.startTicker();
  }

  private playStep() {
    this.stopVoice(true);
    const step = this.queue[this.idx];
    if (!step) return this.finish();

    const buffer = renderBuffer(this.ctx, step.hz, { carrier: this.opts.carrier });
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + FADE_SECONDS * 6);

    source.connect(gain).connect(this.master);
    source.start();

    this.voice = { source, gain };
    this.stepStartedAt = this.ctx.currentTime - this.pausedOffset;
    this.pausedOffset = 0;
    this.emit();
  }

  private stopVoice(fade: boolean) {
    const v = this.voice;
    if (!v) return;
    this.voice = null;
    const t = this.ctx.currentTime;
    if (fade) {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0, t + FADE_SECONDS);
      v.source.stop(t + FADE_SECONDS + 0.01);
    } else {
      try {
        v.source.stop();
      } catch {
        /* already stopped */
      }
    }
  }

  private startTicker() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.running) return;
      const step = this.queue[this.idx];
      if (!step) return;
      const elapsed = this.ctx.currentTime - this.stepStartedAt;
      if (elapsed >= step.seconds) {
        this.idx += 1;
        if (this.idx >= this.queue.length) return this.finish();
        this.playStep();
      } else {
        this.emit();
      }
    }, 250);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.pausedOffset = this.ctx.currentTime - this.stepStartedAt;
    this.stopVoice(true);
    this.emit();
  }

  async resume() {
    if (this.running) return;
    await preWarm();
    this.running = true;
    this.playStep();
    this.emit();
  }

  skip(delta: number) {
    const next = Math.min(Math.max(0, this.idx + delta), this.queue.length - 1);
    this.idx = next;
    this.pausedOffset = 0;
    if (this.running) this.playStep();
    else this.emit();
  }

  stop() {
    this.running = false;
    this.stopVoice(false);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.emit();
  }

  private finish() {
    this.running = false;
    this.stopVoice(true);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.idx = this.queue.length;
    this.emit();
    this.onComplete?.();
  }

  private emit() {
    const step = this.queue[this.idx];
    const elapsedInStep = step ? Math.min(this.ctx.currentTime - this.stepStartedAt, step.seconds) : 0;
    this.onUpdate?.({
      isPlaying: this.running,
      index: this.idx,
      frequency: step?.hz ?? null,
      mode: step ? deliveryModeFor(step.hz) : null,
      elapsedInStep: this.running || this.pausedOffset ? elapsedInStep : this.pausedOffset,
      stepDuration: step?.seconds ?? 0,
      totalElapsed: this.elapsedBefore(this.idx) + elapsedInStep,
      totalDuration: this.totalDuration,
      phase: step?.phase ?? "complete",
    });
  }

  get steps() {
    return this.queue;
  }
}

/* ------------------------------------------------------------------
   WAV export — renders the whole session offline into a 16-bit PCM file.
   ------------------------------------------------------------------ */

export async function renderSessionToWav(
  opts: SessionOptions & { sampleRate?: number },
): Promise<Blob> {
  const rate = opts.sampleRate ?? 44100;
  const step = opts.stepSeconds ?? 180;
  const phaseSec = opts.phaseSeconds ?? 120;

  const plan: { hz: number; seconds: number }[] = [];
  if (opts.grounding) plan.push({ hz: PHASE_FREQUENCIES.grounding, seconds: phaseSec });
  for (const hz of opts.frequencies) plan.push({ hz, seconds: step });
  if (opts.clearing) plan.push({ hz: PHASE_FREQUENCIES.clearing, seconds: phaseSec });
  if (opts.lockIn) plan.push({ hz: PHASE_FREQUENCIES.lockin, seconds: phaseSec });

  const total = plan.reduce((a, s) => a + s.seconds, 0);
  const OfflineCtor =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const off = new OfflineCtor(2, Math.ceil(total * rate), rate);

  let t = 0;
  for (const s of plan) {
    const buf = renderBuffer(off, s.hz, { carrier: opts.carrier });
    const src = off.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = off.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.volume ?? 0.8, t + 0.6);
    g.gain.setValueAtTime(opts.volume ?? 0.8, t + s.seconds - 0.6);
    g.gain.linearRampToValueAtTime(0, t + s.seconds);
    src.connect(g).connect(off.destination);
    src.start(t);
    src.stop(t + s.seconds);
    t += s.seconds;
  }

  const rendered = await off.startRendering();
  return encodeWav(rendered);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = frames * numCh * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  str(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, bytes, true);

  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));

  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }

  return new Blob([out], { type: "audio/wav" });
}
