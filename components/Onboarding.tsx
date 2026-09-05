"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Search, Headphones, Play, Sparkles, X, type LucideIcon } from "lucide-react";

const STORAGE_KEY = "qt_onboarding_v3";

type Illustration = "search" | "headphones" | "play" | "receive";

type Step = {
  title: string;
  body: string;
  Icon: LucideIcon;
  illustration: Illustration;
};

const STEPS: Step[] = [
  {
    title: "Find a protocol",
    body: "Search any condition, pathogen or symptom across 1,395 Rife protocols and 22 pure tones.",
    Icon: Search,
    illustration: "search",
  },
  {
    title: "Put on headphones",
    body: "Binaural beats need both ears to hear something slightly different. Headphones are required.",
    Icon: Headphones,
    illustration: "headphones",
  },
  {
    title: "Start your session",
    body: "Press play. Each frequency runs in sequence over an ambient bed you choose.",
    Icon: Play,
    illustration: "play",
  },
  {
    title: "Relax and receive",
    body: "Sit back, breathe and let the session run. Review it afterward from your sessions tab.",
    Icon: Sparkles,
    illustration: "receive",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* localStorage unavailable, skip onboarding rather than crash */
    }
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
  };

  const advance = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.x < -60) advance();
    else if (info.offset.x > 60) back();
  };

  if (!open) return null;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-void/85 px-5 backdrop-blur-sm">
      <div className="glass rim relative w-full max-w-[400px] overflow-hidden p-6">
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 text-ink-faint transition-colors hover:text-ink"
          aria-label="Skip onboarding"
        >
          <X className="size-4" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="cursor-grab touch-pan-y active:cursor-grabbing"
          >
            <StepIllustration kind={current.illustration} Icon={current.Icon} />
            <h2 className="t-display mt-6 text-center text-[1.35rem] text-ink">{current.title}</h2>
            <p className="mt-2.5 text-center text-[0.85rem] leading-relaxed text-ink-mute">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "1.5rem" : "0.4rem",
                background: i === step ? "var(--color-cyan)" : "var(--color-hairline)",
              }}
            />
          ))}
        </div>

        <div className="mt-6 flex gap-2.5">
          <button onClick={close} className="btn btn-ghost flex-1 py-3 text-[0.68rem]">
            Skip
          </button>
          <button onClick={advance} className="btn btn-primary flex-1 py-3 text-[0.68rem]">
            {step === STEPS.length - 1 ? "Start" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepIllustration({ kind, Icon }: { kind: Illustration; Icon: LucideIcon }) {
  return (
    <div className="relative mx-auto grid h-[168px] w-[168px] place-items-center">
      <div className="rings h-full">
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
      </div>
      <svg viewBox="0 0 168 168" className="absolute inset-0" aria-hidden>
        {kind === "search" && (
          <circle
            cx="84"
            cy="84"
            r="46"
            fill="none"
            stroke="var(--color-cyan)"
            strokeOpacity="0.28"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
        )}
        {kind === "headphones" && (
          <path
            d="M40 92 A44 44 0 0 1 128 92"
            fill="none"
            stroke="var(--color-cyan)"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {kind === "play" && (
          <>
            <path
              d="M18 84 Q38 60 56 84 T94 84 T132 84 T150 84"
              fill="none"
              stroke="var(--color-magenta)"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <path
              d="M18 84 Q38 108 56 84 T94 84 T132 84 T150 84"
              fill="none"
              stroke="var(--color-cyan)"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
          </>
        )}
        {kind === "receive" && (
          <>
            <circle cx="84" cy="84" r="30" fill="none" stroke="var(--color-violet)" strokeOpacity="0.3" strokeWidth="1.5" />
            <circle cx="84" cy="84" r="18" fill="none" stroke="var(--color-cyan)" strokeOpacity="0.4" strokeWidth="1.5" />
          </>
        )}
      </svg>
      <div className="relative grid size-16 place-items-center rounded-full border border-cyan/35 bg-cyan/10">
        <Icon className="size-7 text-cyan-glow" strokeWidth={1.8} />
      </div>
    </div>
  );
}
