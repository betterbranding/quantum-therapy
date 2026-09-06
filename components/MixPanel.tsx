"use client";

import { Activity, Music2, RotateCcw } from "lucide-react";
import { DEFAULT_MIX, describeBalance, type Mix } from "@/lib/audio/mix";

type Props = {
  mix: Mix;
  onChange: (next: Mix) => void;
  /** Whether a pad is currently selected. Pad slider dims when not. */
  padActive: boolean;
  className?: string;
};

export function MixPanel({ mix, onChange, padActive, className }: Props) {
  const isDefault = mix.tone === DEFAULT_MIX.tone && mix.pad === DEFAULT_MIX.pad;

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <p className="t-label">Mix</p>
        <div className="flex items-center gap-3">
          <span className="t-mono text-[0.62rem] text-cyan/90">{describeBalance(mix)}</span>
          {!isDefault && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_MIX)}
              className="flex items-center gap-1 text-[0.62rem] text-ink-faint transition-colors hover:text-ink"
              aria-label="Reset mix"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <Slider
          icon={<Activity className="size-4 shrink-0 text-ink-faint" />}
          label="Frequency"
          value={mix.tone}
          onChange={(v) => onChange({ ...mix, tone: v })}
        />
        <Slider
          icon={<Music2 className="size-4 shrink-0 text-ink-faint" />}
          label="Pad"
          value={mix.pad}
          dim={!padActive}
          hint={padActive ? undefined : "Pick a pad below"}
          onChange={(v) => onChange({ ...mix, pad: v })}
        />
      </div>
    </div>
  );
}

function Slider({
  icon,
  label,
  value,
  onChange,
  dim,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  dim?: boolean;
  hint?: string;
}) {
  return (
    <div className={dim ? "opacity-55 transition-opacity" : "transition-opacity"}>
      <div className="mb-1.5 flex items-center justify-between text-[0.68rem]">
        <span className="text-ink">{label}</span>
        <span className="t-mono text-ink-faint">{hint ?? Math.round(value * 100)}</span>
      </div>
      <div className="flex items-center gap-3">
        {icon}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-raised accent-cyan"
          aria-label={`${label} volume`}
        />
      </div>
    </div>
  );
}
