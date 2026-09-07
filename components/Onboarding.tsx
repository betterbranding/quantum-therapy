"use client";

/**
 * Onboarding, playbook edition.
 *
 * The old four-slide tour explained the product before the visitor had heard a
 * single beat. This replaces it with ONE question: "What are you here for?"
 * (Commitment + Personalisation). The answer reorders the home library and
 * pre-selects a matching pad. Everything else the tour used to explain is now
 * shown in context, at the moment it matters, inside the player.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { INTENTS, isOnboarded, markOnboarded, saveIntent, type IntentId } from "@/lib/intent";

export function Onboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isOnboarded()) setOpen(true);
  }, []);

  const dismiss = () => {
    markOnboarded();
    setOpen(false);
  };

  const choose = (id: IntentId) => {
    saveIntent(id);
    markOnboarded();
    // Let the home page react to the new intent without a full reload.
    window.dispatchEvent(new CustomEvent("qt:intent", { detail: id }));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-void/85 px-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="glass rim relative w-full max-w-[420px] overflow-hidden p-6"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 z-10 text-ink-faint transition-colors hover:text-ink"
              aria-label="Skip"
            >
              <X className="size-4" />
            </button>

            <p className="t-label text-cyan-glow">Welcome</p>
            <h2 className="t-display mt-2 text-[1.5rem] leading-tight text-ink">
              What are you here for?
            </h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-mute">
              Pick one and we will tune the library to you. You can explore everything either way.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {INTENTS.map((intent, i) => (
                <motion.button
                  key={intent.id}
                  onClick={() => choose(intent.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.035, duration: 0.28 }}
                  className={
                    intent.id === "explore"
                      ? "chip col-span-2 justify-center py-3 text-[0.8rem]"
                      : "chip justify-center py-3 text-[0.8rem]"
                  }
                >
                  {intent.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
