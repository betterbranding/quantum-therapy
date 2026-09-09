"use client";

import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import {
  CORE_PRESETS,
  SIGNATURE_PRESETS,
  type AmbientPreset,
  type AmbientPresetId,
  type AmbientStatus,
} from "@/lib/audio/ambient";
import { cn } from "@/lib/utils";

type Props = {
  /** Currently selected pad, or null for tone only. */
  value: AmbientPresetId | null;
  /** Called with the pad the listener picked, or null for tone only. */
  onChange: (id: AmbientPresetId | null) => void;
  /** Paid plans hear the Signature Series. */
  isPro: boolean;
  status?: AmbientStatus;
  /** Shown when a free listener taps a locked pad. */
  onLocked?: (preset: AmbientPreset) => void;
  className?: string;
};

/**
 * Pad picker with two shelves: the free Core collection, and the Signature
 * Series, which is Pro only. Locked pads stay visible and tappable on purpose,
 * because seeing what is behind the door is the whole point of the shelf.
 */
export function PadPicker({ value, onChange, isPro, status = "idle", onLocked, className }: Props) {
  const choose = (p: AmbientPreset) => {
    if (!p.free && !isPro) {
      onLocked?.(p);
      return;
    }
    onChange(value === p.id ? null : p.id);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <p className="t-label">Synth pad bed</p>
        {status === "loading" ? (
          <span className="text-[0.62rem] text-cyan">Loading pad</span>
        ) : status === "error" ? (
          <span className="text-[0.62rem] text-ink-faint">Pad unavailable offline</span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {CORE_PRESETS.map((p) => (
          <PadCard key={p.id} preset={p} selected={value === p.id} onClick={() => choose(p)} />
        ))}
      </div>

      {value !== null && (
        <button
          onClick={() => onChange(null)}
          className="mt-2 w-full text-center text-[0.65rem] text-ink-faint transition-colors hover:text-ink-mute"
        >
          Turn the pad off, tone only
        </button>
      )}

      {/* ---------------- SIGNATURE SERIES ---------------- */}
      <div className="mt-5">
        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d4af6a]/45 to-[#d4af6a]/45" />
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[#d4af6a]">
            <Sparkles className="size-3" />
            Signature Series
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#d4af6a]/45 to-[#d4af6a]/45" />
        </div>

        <p className="mt-2 text-center text-[0.65rem] leading-snug text-ink-faint">
          Four-minute studio-mastered beds, richer and far slower to repeat.
          {!isPro ? " Included with Pro." : null}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {SIGNATURE_PRESETS.map((p) => (
            <PadCard
              key={p.id}
              preset={p}
              selected={value === p.id}
              locked={!isPro}
              onClick={() => choose(p)}
            />
          ))}
        </div>

        {!isPro && (
          <Link
            href="/pricing"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-[#d4af6a]/40 bg-[#d4af6a]/[0.07] px-4 py-2.5 text-[0.72rem] font-medium text-[#e8c886] transition-colors hover:bg-[#d4af6a]/[0.13]"
          >
            <Sparkles className="size-3.5" />
            Unlock all six with Pro
          </Link>
        )}
      </div>
    </div>
  );
}

function PadCard({
  preset,
  selected,
  locked = false,
  onClick,
}: {
  preset: AmbientPreset;
  selected: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  const signature = preset.collection === "signature";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300",
        selected
          ? signature
            ? "border-[#d4af6a]/70 bg-[#d4af6a]/[0.12]"
            : "border-cyan/60 bg-cyan/12"
          : signature
            ? "border-[#d4af6a]/25 bg-deep/60 hover:border-[#d4af6a]/50"
            : "border-hairline/70 bg-deep/50 hover:border-cyan/35",
        locked && "opacity-70",
      )}
    >
      {signature && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(120% 80% at 100% 0%, rgba(212,175,106,0.16), transparent 60%)",
          }}
        />
      )}
      <div className="relative flex items-center justify-between">
        <span
          className="size-2 rounded-full"
          style={{ background: preset.accent, boxShadow: `0 0 10px ${preset.accent}` }}
        />
        {selected ? (
          <Check className={cn("size-3", signature ? "text-[#e8c886]" : "text-cyan")} />
        ) : locked ? (
          <Lock className="size-2.5 text-[#d4af6a]/80" />
        ) : null}
      </div>
      <div className="relative mt-2 text-[0.8rem] font-medium text-ink">{preset.name}</div>
      <div className="relative mt-0.5 text-[0.65rem] leading-snug text-ink-faint">
        {preset.description}
      </div>
    </button>
  );
}
