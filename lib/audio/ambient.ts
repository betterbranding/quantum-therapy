/**
 * Ambient soundscape engine.
 *
 * Five presets, all fully synthesised. No audio files to host, no CDN to expire,
 * no licensing. Each preset layers detuned oscillator pads, filtered noise beds
 * and a slow LFO so the texture never audibly loops.
 *
 * Runs on the same global AudioContext as the binaural engine and sits well
 * below it in level so it never masks the beat.
 */

import { getAudioContext } from "./engine";

export type AmbientPresetId = "deep-space" | "ocean-drift" | "crystal-cavern" | "forest-dawn" | "aurora";

export type AmbientPreset = {
  id: AmbientPresetId;
  name: string;
  description: string;
  /** true = available on the free tier */
  free: boolean;
  accent: string;
};

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: "deep-space",
    name: "Deep Space",
    description: "Vast low drone with slow harmonic drift",
    free: true,
    accent: "#22d3ee",
  },
  {
    id: "ocean-drift",
    name: "Ocean Drift",
    description: "Filtered surf swells and a warm underwater pad",
    free: false,
    accent: "#38bdf8",
  },
  {
    id: "crystal-cavern",
    name: "Crystal Cavern",
    description: "Glassy bell partials with long reverberant tails",
    free: false,
    accent: "#a78bfa",
  },
  {
    id: "forest-dawn",
    name: "Forest Dawn",
    description: "Airy high bed, gentle wind, soft organic motion",
    free: false,
    accent: "#4ade80",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Shimmering upper pad that rises and falls in waves",
    free: false,
    accent: "#f472b6",
  },
];

type Recipe = {
  /** partials in Hz relative to a root */
  root: number;
  partials: number[];
  noise: { type: "lowpass" | "bandpass" | "highpass"; freq: number; q: number; level: number } | null;
  filter: { type: BiquadFilterType; freq: number; q: number };
  lfo: { rate: number; depth: number };
  level: number;
};

const RECIPES: Record<AmbientPresetId, Recipe> = {
  "deep-space": {
    root: 55,
    partials: [1, 1.5, 2.005, 3.01],
    noise: { type: "lowpass", freq: 260, q: 0.7, level: 0.05 },
    filter: { type: "lowpass", freq: 620, q: 0.9 },
    lfo: { rate: 0.045, depth: 260 },
    level: 0.2,
  },
  "ocean-drift": {
    root: 82.4,
    partials: [1, 2.002, 2.996],
    noise: { type: "bandpass", freq: 520, q: 0.55, level: 0.15 },
    filter: { type: "lowpass", freq: 1050, q: 0.6 },
    lfo: { rate: 0.085, depth: 620 },
    level: 0.18,
  },
  "crystal-cavern": {
    root: 174.6,
    partials: [1, 2.01, 3.02, 4.98, 7.03],
    noise: { type: "highpass", freq: 3600, q: 0.5, level: 0.035 },
    filter: { type: "bandpass", freq: 1500, q: 1.6 },
    lfo: { rate: 0.07, depth: 900 },
    level: 0.13,
  },
  "forest-dawn": {
    root: 110,
    partials: [1, 1.498, 2.004, 3.99],
    noise: { type: "bandpass", freq: 2200, q: 0.42, level: 0.1 },
    filter: { type: "lowpass", freq: 2400, q: 0.7 },
    lfo: { rate: 0.11, depth: 1100 },
    level: 0.15,
  },
  aurora: {
    root: 146.8,
    partials: [1, 1.335, 2.007, 2.67, 4.01],
    noise: { type: "highpass", freq: 5200, q: 0.6, level: 0.03 },
    filter: { type: "lowpass", freq: 3000, q: 1.1 },
    lfo: { rate: 0.055, depth: 1500 },
    level: 0.14,
  },
};

function makeNoiseBuffer(ctx: AudioContext, seconds = 6): AudioBuffer {
  const frames = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, frames, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    // Brown-ish noise: far less fatiguing than white over a long session.
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
  }
  return buf;
}

export class AmbientEngine {
  private ctx: AudioContext;
  private out: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private current: AmbientPresetId | null = null;

  constructor(private level = 0.35) {
    this.ctx = getAudioContext();
  }

  get preset() {
    return this.current;
  }

  setLevel(v: number) {
    this.level = v;
    if (this.out) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.4);
  }

  async play(id: AmbientPresetId) {
    if (this.current === id) return;
    this.stop();
    const r = RECIPES[id];
    const now = this.ctx.currentTime;

    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(this.level * r.level, now + 4);
    out.connect(this.ctx.destination);

    const filter = this.ctx.createBiquadFilter();
    filter.type = r.filter.type;
    filter.frequency.value = r.filter.freq;
    filter.Q.value = r.filter.q;
    filter.connect(out);

    // Slow filter sweep so the bed breathes.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = r.lfo.rate;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = r.lfo.depth;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    this.nodes.push(lfo);

    // Detuned partial stack, hard-panned in alternating directions for width.
    r.partials.forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = r.root * mult;
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * (4 + i * 2.5);

      const g = this.ctx.createGain();
      g.gain.value = 0.5 / (i + 1.4);

      const pan = this.ctx.createStereoPanner();
      pan.pan.value = i === 0 ? 0 : (i % 2 === 0 ? 0.55 : -0.55) * (1 - i * 0.08);

      osc.connect(g).connect(pan).connect(filter);
      osc.start();
      this.nodes.push(osc);
    });

    if (r.noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(this.ctx);
      src.loop = true;
      const nf = this.ctx.createBiquadFilter();
      nf.type = r.noise.type;
      nf.frequency.value = r.noise.freq;
      nf.Q.value = r.noise.q;
      const ng = this.ctx.createGain();
      ng.gain.value = r.noise.level;
      src.connect(nf).connect(ng).connect(filter);
      src.start();
      this.nodes.push(src);
    }

    this.out = out;
    this.current = id;
  }

  stop() {
    const out = this.out;
    const nodes = this.nodes;
    this.out = null;
    this.nodes = [];
    this.current = null;
    if (!out) return;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 1.6);
    nodes.forEach((n) => {
      try {
        n.stop(t + 1.7);
      } catch {
        /* noop */
      }
    });
  }
}
