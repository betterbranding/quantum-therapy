"use client";

/**
 * First-session Success Moment.
 *
 * Fires the first time a session reaches 100 percent. It acknowledges the work
 * (frequency count, duration) and offers the single most useful next action:
 *   - Signed out: "Save this session", which is the sign-in prompt delivered at
 *     the exact moment it has an obvious benefit (Permission Serve).
 *   - Signed in: a gentle nudge back into the library.
 *
 * The parent decides when to render this (first completion only) and controls
 * dismissal.
 */

import { motion } from "motion/react";
import Link from "next/link";
import { Check, ArrowRight, Bookmark } from "lucide-react";

type Props = {
  title: string;
  freqCount: number;
  durationSecs: number;
  signedIn: boolean;
  onClose: () => void;
};

function formatDuration(secs: number): string {
  const m = Math.round(secs / 60);
  if (m < 1) return "under a minute";
  if (m === 1) return "1 minute";
  return `${m} minutes`;
}

export function SessionCompleteMoment({ title, freqCount, durationSecs, signedIn, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-void/85 px-5 backdrop-blur-sm">
      <motion.div
        className="glass rim relative w-full max-w-[400px] overflow-hidden p-7 text-center"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="mx-auto grid size-16 place-items-center rounded-full border border-cyan/40 bg-cyan/12"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
        >
          <Check className="size-7 text-cyan-glow" strokeWidth={2.4} />
        </motion.div>

        <p className="t-label mt-5 text-cyan-glow">Session complete</p>
        <h2 className="t-display mt-2 text-[1.4rem] leading-tight text-ink">
          That was your first one
        </h2>
        <p className="mt-2.5 text-[0.85rem] leading-relaxed text-ink-mute">
          {title}. {freqCount} {freqCount === 1 ? "frequency" : "frequencies"} over{" "}
          {formatDuration(durationSecs)}. Nicely done.
        </p>

        {signedIn ? (
          <div className="mt-6 flex flex-col gap-2.5">
            <Link href="/search" className="btn btn-primary w-full justify-center py-3 text-[0.7rem]">
              Find your next protocol <ArrowRight className="size-3.5" />
            </Link>
            <button onClick={onClose} className="btn btn-ghost w-full justify-center py-3 text-[0.68rem]">
              Stay here
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/profile?next=save"
              className="btn btn-primary w-full justify-center py-3 text-[0.7rem]"
            >
              <Bookmark className="size-3.5" /> Save this session
            </Link>
            <p className="text-[0.72rem] leading-relaxed text-ink-faint">
              Create a free account to keep your history and pick up where you left off.
            </p>
            <button onClick={onClose} className="btn btn-ghost w-full justify-center py-3 text-[0.68rem]">
              Maybe later
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
