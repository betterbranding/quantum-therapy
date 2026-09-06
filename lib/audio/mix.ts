/**
 * Mix settings: frequency (binaural/isochronic tone) level vs synth pad level.
 *
 * Both are 0..1 linear gains on their own master bus. They are persisted on
 * the device so a listener's preferred balance carries across every protocol
 * and tone.
 *
 * The engine trims the tone bus (TONE_TRIM in engine.ts) so that the two
 * sliders share one loudness scale: equal positions sound equal. That makes
 * the on-screen readout a straight ratio of the two slider values.
 * TONE_OFFSET_DB is kept for any future re-mastering of the pads.
 */

export type Mix = { tone: number; pad: number };

export const DEFAULT_MIX: Mix = { tone: 0.6, pad: 0.85 };

const KEY = "qt.mix.v3";
const TONE_OFFSET_DB = 0;

const clamp = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function loadMix(): Mix {
  if (typeof window === "undefined") return DEFAULT_MIX;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MIX;
    const p = JSON.parse(raw) as Partial<Mix>;
    return {
      tone: typeof p.tone === "number" ? clamp(p.tone) : DEFAULT_MIX.tone,
      pad: typeof p.pad === "number" ? clamp(p.pad) : DEFAULT_MIX.pad,
    };
  } catch {
    return DEFAULT_MIX;
  }
}

export function saveMix(mix: Mix): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(mix));
  } catch {
    /* private mode, quota, etc. Not worth surfacing. */
  }
}

const toDb = (g: number) => (g <= 0 ? -Infinity : 20 * Math.log10(g));

/** Perceived pad level relative to the frequency, in dB. Positive = pad louder. */
export function padOverToneDb(mix: Mix): number {
  return toDb(mix.pad) - (toDb(mix.tone) + TONE_OFFSET_DB);
}

/** Human readout for the mix panel. */
export function describeBalance(mix: Mix): string {
  if (mix.pad <= 0 && mix.tone <= 0) return "Silent";
  if (mix.pad <= 0) return "Frequency only";
  if (mix.tone <= 0) return "Pad only";
  const d = padOverToneDb(mix);
  const r = Math.round(d);
  if (Math.abs(r) < 1) return "Balanced";
  return r > 0 ? `Pad +${r} dB over frequency` : `Frequency +${-r} dB over pad`;
}
