"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Headphones,
  Download,
  Lock,
  Waves,
  Check,
} from "lucide-react";
import {
  SessionPlayer,
  preWarm,
  deliveryModeFor,
  renderSessionToWav,
  verifyEngineAfter,
  BLOCKED_NOTICE,
  PHASE_FREQUENCIES,
  type PlayerState,
  type PhaseName,
} from "@/lib/audio/engine";
import {
  AmbientEngine,
  AMBIENT_PRESETS,
  preloadAmbient,
  type AmbientPresetId,
  type AmbientStatus,
} from "@/lib/audio/ambient";
import { unlockIOSAudio, setMediaSession } from "@/lib/audio/iosUnlock";
import { DEFAULT_MIX, loadMix, saveMix, type Mix } from "@/lib/audio/mix";
import { MixPanel } from "@/components/MixPanel";
import { cn, formatClock, formatHz } from "@/lib/utils";
import type { Protocol, TierId } from "@/lib/supabase/types";

const STEP_OPTIONS = [60, 120, 180, 300];

const PHASE_COPY: Record<PhaseName, string> = {
  grounding: "Grounding",
  protocol: "Protocol",
  clearing: "Clearing",
  lockin: "Lock-In",
  complete: "Complete",
};

type Props = {
  protocol: Protocol;
  tier: TierId;
  signedIn: boolean;
};

export function ProtocolPlayer({ protocol, tier, signedIn }: Props) {
  const isPro = tier === "pro" || tier === "premium";

  const [stepSeconds, setStepSeconds] = useState(180);
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const volume = mix.tone;
  const [ambient, setAmbient] = useState<AmbientPresetId | null>(null);
  const [ambientStatus, setAmbientStatus] = useState<AmbientStatus>("idle");
  const [grounding, setGrounding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lockIn, setLockIn] = useState(false);
  const [state, setState] = useState<PlayerState | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const playerRef = useRef<SessionPlayer | null>(null);
  const ambientRef = useRef<AmbientEngine | null>(null);
  const sessionIdRef = useRef<number | null>(null);

  const options = useMemo(
    () => ({
      frequencies: protocol.frequencies,
      stepSeconds,
      volume,
      grounding: isPro && grounding,
      clearing: isPro && clearing,
      lockIn: isPro && lockIn,
      phaseSeconds: 120,
    }),
    [protocol.frequencies, stepSeconds, volume, grounding, clearing, lockIn, isPro],
  );

  const totalSeconds = useMemo(() => {
    const phases = [options.grounding, options.clearing, options.lockIn].filter(Boolean).length;
    return protocol.frequencies.length * stepSeconds + phases * 120;
  }, [protocol.frequencies.length, stepSeconds, options]);

  // Tear down on unmount. Leaving an oscillator running after navigation is
  // the single most common bug in audio apps.
  // Hydrate saved mix after mount (localStorage is client only).
  useEffect(() => {
    setMix(loadMix());
  }, []);

  useEffect(() => {
    return () => {
      playerRef.current?.stop();
      ambientRef.current?.stop();
    };
  }, []);

  const finishSession = useCallback(async (elapsed: number) => {
    const id = sessionIdRef.current;
    sessionIdRef.current = null;
    if (!id) return;
    try {
      await fetch("/api/session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, duration: Math.round(elapsed) }),
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  const start = useCallback(async () => {
    // Everything in this first block must stay inside the gesture.
    unlockIOSAudio();
    await preWarm();

    setStarting(true);
    setNotice(null);

    if (signedIn) {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: protocol.name,
            frequencies: protocol.frequencies,
            protocolId: protocol.id,
            ambient,
          }),
        });
        if (res.status === 402) {
          const data = await res.json();
          setStarting(false);
          setNotice(
            `You have used all ${data.limit ?? 10} free sessions this month. Upgrade for unlimited playback.`,
          );
          return;
        }
        const data = await res.json();
        sessionIdRef.current = data?.id ?? null;
      } catch {
        /* tracking is best-effort, never block playback */
      }
    }

    const player = new SessionPlayer(options);
    player.onUpdate = setState;
    player.onComplete = () => {
      void finishSession(totalSeconds);
      ambientRef.current?.stop();
    };
    playerRef.current = player;

    if (ambient) {
      const amb = ambientRef.current ?? new AmbientEngine(mix.pad);
      amb.onStatus = setAmbientStatus;
      ambientRef.current = amb;
      void amb.play(ambient);
    }

    setMediaSession(protocol.name);
    await player.start();
    setStarting(false);
    verifyEngineAfter(1200, (blocked) => {
      if (blocked) setNotice(BLOCKED_NOTICE);
    });
  }, [options, ambient, protocol, signedIn, finishSession, totalSeconds]);

  const toggle = useCallback(async () => {
    const p = playerRef.current;
    if (!p || state?.phase === "complete") return start();
    if (state?.isPlaying) {
      p.pause();
      ambientRef.current?.stop();
    } else {
      unlockIOSAudio();
      await preWarm();
      await p.resume();
      if (ambient) void ambientRef.current?.play(ambient);
      verifyEngineAfter(1200, (blocked) => {
        if (blocked) setNotice(BLOCKED_NOTICE);
        else setNotice((n) => (n === BLOCKED_NOTICE ? null : n));
      });
    }
  }, [state, start, ambient]);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    ambientRef.current?.stop();
    void finishSession(state?.totalElapsed ?? 0);
    playerRef.current = null;
    setState(null);
  }, [state, finishSession]);

  const changeMix = (next: Mix) => {
    setMix(next);
    saveMix(next);
    playerRef.current?.setVolume(next.tone);
    ambientRef.current?.setLevel(next.pad);
  };

  const chooseAmbient = (id: AmbientPresetId) => {
    const preset = AMBIENT_PRESETS.find((p) => p.id === id);
    if (preset && !preset.free && !isPro) {
      setNotice("That soundscape is part of Pro. Deep Space is available on every plan.");
      return;
    }
    const next = ambient === id ? null : id;
    setAmbient(next);
    if (next) preloadAmbient(next);
    if (!playerRef.current || !state?.isPlaying) return;
    const amb = ambientRef.current ?? new AmbientEngine(mix.pad);
    amb.onStatus = setAmbientStatus;
    ambientRef.current = amb;
    if (next) void amb.play(next);
    else amb.stop();
  };

  const download = async () => {
    if (!isPro) {
      setNotice("Offline WAV downloads are part of Pro.");
      return;
    }
    setDownloading(true);
    try {
      const blob = await renderSessionToWav({ ...options, stepSeconds: Math.min(stepSeconds, 120) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${protocol.slug}-quantum-therapy.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice("The session was too long to render offline. Try a shorter frequency duration.");
    } finally {
      setDownloading(false);
    }
  };

  const active = state?.isPlaying ?? false;
  const progress = state && state.totalDuration ? state.totalElapsed / state.totalDuration : 0;
  const currentHz = state?.frequency ?? protocol.frequencies[0];

  return (
    <div className="space-y-4">
      {/* ---------------- TRANSPORT ---------------- */}
      <div className="glass rim relative overflow-hidden p-6">
        {active && (
          <div className="rings absolute inset-0 opacity-60">
            <span className="ring" />
            <span className="ring" />
            <span className="ring" />
            <span className="ring" />
          </div>
        )}

        <div className="relative flex flex-col items-center">
          <div className="t-label opacity-80">
            {state ? PHASE_COPY[state.phase] : "Ready"}
            {state && state.phase === "protocol"
              ? ` · ${Math.min(state.index + 1, protocol.frequencies.length)} of ${protocol.frequencies.length}`
              : ""}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentHz}
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 flex flex-col items-center"
            >
              <div
                className={cn(
                  "t-freq text-[3.25rem] leading-none",
                  active ? "grad-primary glow-cyan" : "text-ink/85",
                )}
              >
                {formatHz(currentHz)}
              </div>
              <div className="mt-1 text-[0.6rem] font-medium tracking-[0.2em] uppercase text-ink-faint">
                Hertz · {deliveryModeFor(currentHz) === "binaural" ? "Binaural" : "Isochronic"}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Overall progress */}
          <div className="mt-6 w-full">
            <div className="h-1 w-full overflow-hidden rounded-full bg-raised/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan via-violet to-magenta"
                animate={{ width: `${Math.min(100, progress * 100)}%` }}
                transition={{ duration: 0.3, ease: "linear" }}
              />
            </div>
            <div className="t-mono mt-2 flex justify-between text-[0.65rem] text-ink-faint">
              <span>{formatClock(state?.totalElapsed ?? 0)}</span>
              <span>{formatClock(state?.totalDuration ?? totalSeconds)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center gap-5">
            <button
              onClick={() => playerRef.current?.skip(-1)}
              disabled={!state}
              className="grid size-11 place-items-center rounded-full border border-hairline/80 bg-raised/50 text-ink-soft transition-all hover:border-cyan/45 hover:text-ink disabled:opacity-30"
              aria-label="Previous frequency"
            >
              <SkipBack className="size-4" />
            </button>

            <button
              onClick={toggle}
              disabled={starting}
              className={cn(
                "grid size-[74px] place-items-center rounded-full transition-transform active:scale-95",
                "bg-gradient-to-br from-cyan via-cyan-deep to-violet text-abyss",
                active && "pulse-orb",
              )}
              aria-label={active ? "Pause session" : "Start session"}
            >
              {starting ? (
                <Waves className="size-7 animate-pulse" strokeWidth={2.4} />
              ) : active ? (
                <Pause className="size-7 fill-current" strokeWidth={0} />
              ) : (
                <Play className="ml-1 size-8 fill-current" strokeWidth={0} />
              )}
            </button>

            <button
              onClick={() => playerRef.current?.skip(1)}
              disabled={!state}
              className="grid size-11 place-items-center rounded-full border border-hairline/80 bg-raised/50 text-ink-soft transition-all hover:border-cyan/45 hover:text-ink disabled:opacity-30"
              aria-label="Next frequency"
            >
              <SkipForward className="size-4" />
            </button>
          </div>

          {state && (
            <button
              onClick={stop}
              className="mt-4 flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-ink-faint transition-colors hover:text-magenta"
            >
              <Square className="size-3 fill-current" strokeWidth={0} />
              End session
            </button>
          )}

          <div className="mt-5 flex items-center gap-2 text-[0.7rem] text-ink-faint">
            <Headphones className="size-3.5 text-cyan/80" />
            Headphones required for binaural delivery
          </div>
        </div>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-magenta/25 bg-magenta/8 p-3.5">
              <p className="text-[0.78rem] leading-relaxed text-ink-soft">{notice}</p>
              <button
                onClick={() => setNotice(null)}
                className="shrink-0 text-[0.7rem] text-ink-faint hover:text-ink"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- MIX ---------------- */}
      <MixPanel className="glass p-4" mix={mix} onChange={changeMix} padActive={ambient !== null} />

      {/* ---------------- DURATION ---------------- */}
      <div className="glass p-4">
        <p className="t-label">Time per frequency</p>
        <div className="mt-3 flex gap-2">
          {STEP_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStepSeconds(s)}
              disabled={Boolean(state)}
              data-active={stepSeconds === s}
              className="chip flex-1 justify-center disabled:opacity-40"
            >
              {s / 60} min
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-[0.7rem] text-ink-faint">
          Full session runs {formatClock(totalSeconds)} across {protocol.frequencies.length}{" "}
          frequencies.
        </p>
      </div>

      {/* ---------------- AMBIENT ---------------- */}
      <div className="glass p-4">
        <div className="flex items-center justify-between">
          <p className="t-label">Synth pad bed</p>
          {ambientStatus === "loading" ? (
            <span className="text-[0.62rem] text-cyan">Loading pad</span>
          ) : ambientStatus === "error" ? (
            <span className="text-[0.62rem] text-ink-faint">Pad unavailable offline</span>
          ) : (
            !isPro && <span className="text-[0.62rem] text-ink-faint">1 of 5 on Free</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {AMBIENT_PRESETS.map((p) => {
            const locked = !p.free && !isPro;
            const on = ambient === p.id;
            return (
              <button
                key={p.id}
                onClick={() => chooseAmbient(p.id)}
                className={cn(
                  "relative rounded-2xl border p-3 text-left transition-all duration-300",
                  on
                    ? "border-cyan/60 bg-cyan/12"
                    : "border-hairline/70 bg-deep/50 hover:border-cyan/35",
                  locked && "opacity-55",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: p.accent, boxShadow: `0 0 10px ${p.accent}` }}
                  />
                  {locked ? (
                    <Lock className="size-3 text-ink-faint" />
                  ) : on ? (
                    <Check className="size-3 text-cyan" />
                  ) : null}
                </div>
                <div className="mt-2 text-[0.8rem] font-medium text-ink">{p.name}</div>
                <div className="mt-0.5 text-[0.65rem] leading-snug text-ink-faint">
                  {p.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- PHASES ---------------- */}
      <div className="glass p-4">
        <div className="flex items-center justify-between">
          <p className="t-label">Session phases</p>
          {!isPro && (
            <span className="flex items-center gap-1 text-[0.62rem] text-ink-faint">
              <Lock className="size-2.5" /> Pro
            </span>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {(
            [
              [
                "grounding",
                "Grounding",
                grounding,
                setGrounding,
                "Two minutes at the Schumann resonance to settle before the protocol.",
              ],
              [
                "clearing",
                "Clearing",
                clearing,
                setClearing,
                "A high sweep tone used to clear the field after the sequence.",
              ],
              [
                "lockin",
                "Lock-In",
                lockIn,
                setLockIn,
                "A short integration tone to close the session.",
              ],
            ] as const
          ).map(([key, label, value, setter, blurb]) => (
            <button
              key={key}
              onClick={() => {
                if (!isPro) return setNotice("Session phases are part of Pro.");
                setter(!value);
              }}
              disabled={Boolean(state)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                value ? "border-cyan/55 bg-cyan/10" : "border-hairline/70 bg-deep/45",
                !isPro && "opacity-55",
                state && "pointer-events-none opacity-40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-md border transition-colors",
                  value ? "border-cyan bg-cyan" : "border-hairline",
                )}
              >
                {value && <Check className="size-3 text-abyss" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-[0.82rem] font-medium text-ink">{label}</span>
                  <span className="t-freq text-[0.62rem] text-cyan">
                    {PHASE_FREQUENCIES[key]} Hz
                  </span>
                </span>
                <span className="mt-0.5 block text-[0.68rem] leading-snug text-ink-faint">
                  {blurb}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- DOWNLOAD ---------------- */}
      <button
        onClick={download}
        disabled={downloading}
        className="btn btn-ghost w-full py-3.5 text-[0.78rem]"
      >
        {isPro ? <Download className="size-4" /> : <Lock className="size-3.5" />}
        {downloading ? "Rendering audio" : "Download session as WAV"}
      </button>

      {/* ---------------- SEQUENCE ---------------- */}
      <div className="glass p-4">
        <p className="t-label">Frequency sequence</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {protocol.frequencies.map((hz, i) => {
            const isCurrent = state?.phase === "protocol" && state.index === i;
            const isPast = state ? state.index > i : false;
            return (
              <span
                key={`${hz}-${i}`}
                className={cn(
                  "t-freq rounded-lg border px-2 py-1 text-[0.66rem] transition-all duration-300",
                  isCurrent
                    ? "scale-110 border-cyan bg-cyan/20 text-cyan-glow shadow-[0_0_18px_-4px_var(--color-cyan)]"
                    : isPast
                      ? "border-hairline/50 bg-deep/40 text-ink-faint/60"
                      : "border-hairline/70 bg-deep/60 text-ink-soft",
                )}
              >
                {formatHz(hz)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
