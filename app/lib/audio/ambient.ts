/**
 * Synth pad bed engine.
 *
 * Eleven generated ambient synth pad tracks (ElevenLabs Music, post-processed
 * into seamless loops, normalised to -18 LUFS) served from /public/music.
 *
 * Core collection: five 147 s loops at 128 kbps, free on every plan.
 * Signature Series: six 241 s loops at 160 kbps, Pro and Premium only. Longer
 * loops mean the repeat is far less perceptible over a long session.
 *
 * Playback runs on the same global AudioContext as the binaural engine, which
 * matters on iOS: one context, one unlock, one audio session. Each track is
 * decoded once and looped by overlapping two buffer sources with an equal-power
 * crossfade, so the seam is inaudible regardless of MP3 encoder padding.
 *
 * Public API is unchanged from the synthesised version: play(id), stop(),
 * setLevel(v), preset. Two additions: preload(id) to warm the decode cache when
 * a user picks a pad before pressing play, and onStatus for a loading indicator.
 */

import { getAudioContext } from "./engine";

export type AmbientPresetId =
  // Core collection, free on every plan
  | "deep-space"
  | "ocean-drift"
  | "crystal-cavern"
  | "forest-dawn"
  | "aurora"
  // Signature Series, Pro and Premium only
  | "obsidian"
  | "golden-hour"
  | "sanctum"
  | "nocturne"
  | "stratosphere"
  | "ember-tide";

export type AmbientCollection = "core" | "signature";

export type AmbientPreset = {
  id: AmbientPresetId;
  name: string;
  description: string;
  /** true = available on the free tier. The whole core collection is free. */
  free: boolean;
  /** Which shelf the pad sits on in the picker. */
  collection: AmbientCollection;
  accent: string;
  /** per-track trim on top of the engine level, 1 = as mastered */
  gain: number;
};

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: "deep-space",
    name: "Deep Space",
    description: "Dark analog pad, sub-heavy, slow harmonic drift",
    free: true,
    collection: "core",
    accent: "#22d3ee",
    gain: 1,
  },
  {
    id: "ocean-drift",
    name: "Ocean Drift",
    description: "Warm rounded pad with slow tidal swells",
    free: true,
    collection: "core",
    accent: "#38bdf8",
    gain: 1,
  },
  {
    id: "crystal-cavern",
    name: "Crystal Cavern",
    description: "Glassy sustained pad, shimmering highs, long tails",
    free: true,
    collection: "core",
    accent: "#a78bfa",
    gain: 1,
  },
  {
    id: "forest-dawn",
    name: "Forest Dawn",
    description: "Airy bright pad, gentle chords opening like daylight",
    free: true,
    collection: "core",
    accent: "#4ade80",
    gain: 1,
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Iridescent wide pad rising and falling in slow waves",
    free: true,
    collection: "core",
    accent: "#f472b6",
    gain: 1,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Velvet cinematic depth, low bowed strings fused into dark analog",
    free: false,
    collection: "signature",
    accent: "#94a3b8",
    gain: 1,
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Tape-warm analog glow, honeyed and nostalgic",
    free: false,
    collection: "signature",
    accent: "#fbbf24",
    gain: 1,
  },
  {
    id: "sanctum",
    name: "Sanctum",
    description: "Vast sacred space, organ-like layers in cathedral reverb",
    free: false,
    collection: "signature",
    accent: "#c4b5fd",
    gain: 1,
  },
  {
    id: "nocturne",
    name: "Nocturne",
    description: "Dusky felt textures, intimate and hushed as midnight",
    free: false,
    collection: "signature",
    accent: "#818cf8",
    gain: 1,
  },
  {
    id: "stratosphere",
    name: "Stratosphere",
    description: "Ultra-wide high-altitude air, crystalline and still",
    free: false,
    collection: "signature",
    accent: "#67e8f9",
    gain: 1,
  },
  {
    id: "ember-tide",
    name: "Ember Tide",
    description: "Smouldering amber warmth breathing under a slow tide",
    free: false,
    collection: "signature",
    accent: "#fb923c",
    gain: 1,
  },
];

/** Pads on the free plan. */
export const CORE_PRESETS = AMBIENT_PRESETS.filter((p) => p.collection === "core");
/** The Pro-only Signature Series: longer, richer, higher-bitrate renders. */
export const SIGNATURE_PRESETS = AMBIENT_PRESETS.filter((p) => p.collection === "signature");

export function presetById(id: AmbientPresetId): AmbientPreset | undefined {
  return AMBIENT_PRESETS.find((p) => p.id === id);
}

/** A pad is playable if it is free, or the listener is on a paid plan. */
export function canPlayPreset(id: AmbientPresetId, isPro: boolean): boolean {
  const p = presetById(id);
  return Boolean(p && (p.free || isPro));
}

export type AmbientStatus = "idle" | "loading" | "playing" | "error";

const trackUrl = (id: AmbientPresetId) => `/music/${id}.mp3`;

/** Seconds of overlap between consecutive loop iterations. */
const XFADE = 2.5;
/** How many iterations to keep scheduled on the audio clock ahead of "now". */
const AHEAD = 2;
/** Fade-in when a bed starts, fade-out when it stops. */
const FADE_IN = 4;
const FADE_OUT = 1.6;
/** Decoded stereo tracks are ~50 MB each; keep memory bounded on phones. */
const CACHE_MAX = 2;

// ---------------------------------------------------------------------------
// Decode cache
// ---------------------------------------------------------------------------

const cache = new Map<AmbientPresetId, Promise<AudioBuffer>>();

function decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Promise form is standard now, but older WebKit only had the callback form.
  return new Promise((resolve, reject) => {
    try {
      const maybe = ctx.decodeAudioData(data, resolve, reject);
      if (maybe && typeof (maybe as Promise<AudioBuffer>).then === "function") {
        (maybe as Promise<AudioBuffer>).then(resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

function loadBuffer(ctx: AudioContext, id: AmbientPresetId): Promise<AudioBuffer> {
  const hit = cache.get(id);
  if (hit) {
    // refresh LRU position
    cache.delete(id);
    cache.set(id, hit);
    return hit;
  }
  const p = (async () => {
    const res = await fetch(trackUrl(id), { cache: "force-cache" });
    if (!res.ok) throw new Error(`pad ${id}: HTTP ${res.status}`);
    const data = await res.arrayBuffer();
    return decode(ctx, data);
  })();
  p.catch(() => cache.delete(id));
  cache.set(id, p);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return p;
}

/** Warm the decode cache so play() is instant. Safe to call without a gesture. */
export function preloadAmbient(id: AmbientPresetId): void {
  try {
    void loadBuffer(getAudioContext(), id).catch(() => {});
  } catch {
    /* no AudioContext yet (SSR or very old browser) */
  }
}

// ---------------------------------------------------------------------------
// Equal-power crossfade curves (built once per context sample rate)
// ---------------------------------------------------------------------------

let curveIn: Float32Array | null = null;
let curveOut: Float32Array | null = null;

function curves(): { fadeIn: Float32Array; fadeOut: Float32Array } {
  if (!curveIn || !curveOut) {
    const n = 256;
    curveIn = new Float32Array(n);
    curveOut = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      curveIn[i] = Math.sin((t * Math.PI) / 2);
      curveOut[i] = Math.cos((t * Math.PI) / 2);
    }
  }
  return { fadeIn: curveIn, fadeOut: curveOut };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

type Iteration = { src: AudioBufferSourceNode; gain: GainNode; start: number; end: number };

export class AmbientEngine {
  private ctx: AudioContext;
  private out: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private iterations: Iteration[] = [];
  private nextStart = 0;
  private current: AmbientPresetId | null = null;
  private generation = 0;
  private topUpTimer: ReturnType<typeof setInterval> | null = null;
  private _status: AmbientStatus = "idle";

  /** Fires on idle / loading / playing / error transitions. */
  onStatus: ((status: AmbientStatus, id: AmbientPresetId | null) => void) | null = null;

  constructor(private level = 0.5) {
    this.ctx = getAudioContext();
  }

  get preset() {
    return this.current;
  }

  get status() {
    return this._status;
  }

  private setStatus(s: AmbientStatus) {
    if (this._status === s) return;
    this._status = s;
    this.onStatus?.(s, this.current);
  }

  private targetGain(): number {
    const p = AMBIENT_PRESETS.find((x) => x.id === this.current);
    return this.level * (p?.gain ?? 1);
  }

  setLevel(v: number) {
    this.level = v;
    if (this.out) this.out.gain.setTargetAtTime(this.targetGain(), this.ctx.currentTime, 0.4);
  }

  async play(id: AmbientPresetId) {
    if (this.current === id && this.out) return;
    const gen = ++this.generation;
    this.teardown();
    this.current = id;
    this.setStatus("loading");

    let buffer: AudioBuffer;
    try {
      buffer = await loadBuffer(this.ctx, id);
    } catch {
      if (gen === this.generation) this.setStatus("error");
      return;
    }
    if (gen !== this.generation) return; // superseded by another play()/stop()

    const now = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(this.targetGain(), now + FADE_IN);
    out.connect(this.ctx.destination);

    this.out = out;
    this.buffer = buffer;
    this.nextStart = now + 0.05;
    this.iterations = [];
    this.ensureScheduled();

    // Timers throttle in background tabs; with AHEAD iterations of ~145 s each
    // on the audio clock we have minutes of slack, this just tops the queue up.
    this.topUpTimer = setInterval(() => this.ensureScheduled(), 15_000);
    this.setStatus("playing");
  }

  /** Keep AHEAD iterations queued on the audio clock. */
  private ensureScheduled() {
    if (!this.out || !this.buffer) return;
    const now = this.ctx.currentTime;
    this.iterations = this.iterations.filter((it) => it.end > now);
    while (this.iterations.length < AHEAD) this.scheduleIteration();
  }

  private scheduleIteration() {
    const buffer = this.buffer;
    const out = this.out;
    if (!buffer || !out) return;
    const gen = this.generation;
    const { fadeIn, fadeOut } = curves();

    const dur = buffer.duration;
    const start = this.nextStart;
    const end = start + dur;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const g = this.ctx.createGain();
    // Silence until the crossfade, so the very first iteration also fades in
    // across XFADE (the master fade-in above is what the listener hears).
    g.gain.setValueAtTime(0, start);
    g.gain.setValueCurveAtTime(fadeIn, start, XFADE);
    g.gain.setValueAtTime(1, start + XFADE + 0.001);
    g.gain.setValueCurveAtTime(fadeOut, end - XFADE, XFADE);

    src.connect(g).connect(out);
    src.start(start);
    src.stop(end + 0.05);

    const it: Iteration = { src, gain: g, start, end };
    this.iterations.push(it);
    this.nextStart = end - XFADE;

    src.onended = () => {
      if (gen !== this.generation) return;
      try {
        src.disconnect();
        g.disconnect();
      } catch {
        /* noop */
      }
      this.ensureScheduled();
    };
  }

  stop() {
    this.generation++;
    this.teardown();
    this.current = null;
    this.setStatus("idle");
  }

  /** Fade out and release everything without touching status/current. */
  private teardown() {
    if (this.topUpTimer) {
      clearInterval(this.topUpTimer);
      this.topUpTimer = null;
    }
    const out = this.out;
    const its = this.iterations;
    this.out = null;
    this.buffer = null;
    this.iterations = [];
    if (!out) return;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + FADE_OUT);
    its.forEach(({ src }) => {
      src.onended = null;
      try {
        src.stop(t + FADE_OUT + 0.1);
      } catch {
        /* already stopped or not yet started */
      }
    });
    setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* noop */
      }
    }, (FADE_OUT + 0.3) * 1000);
  }
}
