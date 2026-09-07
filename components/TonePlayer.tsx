"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Headphones } from "lucide-react";
import { DEFAULT_MIX, loadMix, saveMix, type Mix } from "@/lib/audio/mix";
import { MixPanel } from "@/components/MixPanel";
import {
  SessionPlayer,
  preWarm,
  deliveryModeFor,
  verifyEngineAfter,
  BLOCKED_NOTICE,
  type PlayerState,
} from "@/lib/audio/engine";
import { AmbientEngine, AMBIENT_PRESETS, preloadAmbient, type AmbientPresetId } from "@/lib/audio/ambient";
import { unlockIOSAudio, setMediaSession } from "@/lib/audio/iosUnlock";
import { SessionCompleteMoment } from "@/components/SessionCompleteMoment";
import { loadIntent, intentById } from "@/lib/intent";
import { completedCount, recordCompletion } from "@/lib/first-session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatClock, cn } from "@/lib/utils";
import type { Tone } from "@/lib/supabase/types";

const DURATIONS = [5, 10, 20, 30, 60];

export function TonePlayer({ tone }: { tone: Tone }) {
  const [minutes, setMinutes] = useState(10);
  const [mix, setMix] = useState<Mix>(DEFAULT_MIX);
  const volume = mix.tone;
  const [ambient, setAmbient] = useState<AmbientPresetId | null>(null);
  const [state, setState] = useState<PlayerState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showFirstComplete, setShowFirstComplete] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const playerRef = useRef<SessionPlayer | null>(null);
  const ambientRef = useRef<AmbientEngine | null>(null);
  // Once the listener picks a pad or turns it off themselves, stop applying the
  // auto-default so we never override their choice.
  const padTouchedRef = useRef(false);

  const mode = deliveryModeFor(tone.frequency);

  useEffect(() => {
    return () => {
      playerRef.current?.stop();
      ambientRef.current?.stop();
    };
  }, []);

  // When duration or tone changes (and nothing is playing) discard the old
  // player. A fresh one is built on the next tap, INSIDE the gesture, so the
  // AudioContext is never created outside user interaction. iOS cares.
  useEffect(() => {
    if (state?.isPlaying) return;
    playerRef.current?.stop();
    playerRef.current = null;
    setState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone.frequency, minutes]);

  const ensurePlayer = () => {
    if (playerRef.current) return playerRef.current;
    const player = new SessionPlayer({
      frequencies: [tone.frequency],
      stepSeconds: minutes * 60,
      volume,
    });
    player.onUpdate = (s) => setState(s);
    player.onComplete = () => {
      ambientRef.current?.stop();
      const isFirst = completedCount() === 0;
      recordCompletion();
      if (isFirst) setShowFirstComplete(true);
    };
    playerRef.current = player;
    return player;
  };

  // Hydrate saved mix after mount (localStorage is client only).
  useEffect(() => {
    setMix(loadMix());
  }, []);

  // Setup Defaults: the pad is ON by default so the first play arrives already
  // scored, not silent. If the visitor declared an intent we tune to its pad;
  // otherwise everyone still gets the free Deep Space. Only free pads are
  // auto-applied here, since a tone viewer's tier is not read on this statically
  // generated page. Once the listener touches the pad control, we stop overriding.
  useEffect(() => {
    if (padTouchedRef.current) return;
    const def = intentById(loadIntent());
    const preset = def ? AMBIENT_PRESETS.find((p) => p.id === def.pad) : undefined;
    const usable = def && preset && preset.free ? def.pad : "deep-space";
    setAmbient(usable);
    preloadAmbient(usable);
  }, []);

  // Lightweight signed-in check, so the Success Moment shows the right CTA
  // without turning this page into a dynamic (non-static) route.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setSignedIn(Boolean(data.user));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    playerRef.current?.setVolume(mix.tone);
    ambientRef.current?.setLevel(mix.pad);
  }, [mix]);

  const changeMix = (next: Mix) => {
    setMix(next);
    saveMix(next);
  };

  const toggle = async () => {
    // Must run synchronously at the start of the gesture, before any other await.
    unlockIOSAudio();
    await preWarm();

    const player = ensurePlayer();

    if (state?.isPlaying) {
      player.pause();
      ambientRef.current?.stop();
      return;
    }

    setMediaSession(tone.name);
    if (ambient) {
      if (!ambientRef.current) ambientRef.current = new AmbientEngine(mix.pad);
      await ambientRef.current.play(ambient);
    }
    if (state && state.totalElapsed > 0 && state.totalElapsed < state.totalDuration) {
      await player.resume();
    } else {
      await player.start();
    }
    verifyEngineAfter(1200, (blocked) => {
      setNotice(blocked ? BLOCKED_NOTICE : null);
    });
  };

  const isPlaying = state?.isPlaying ?? false;
  const elapsed = state?.totalElapsed ?? 0;
  const total = state?.totalDuration ?? minutes * 60;
  const remaining = Math.max(0, total - elapsed);
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

  return (
    <div className="mt-6">
      {showFirstComplete && (
        <SessionCompleteMoment
          title={tone.name}
          freqCount={1}
          durationSecs={state?.totalElapsed ?? minutes * 60}
          signedIn={signedIn}
          onClose={() => setShowFirstComplete(false)}
        />
      )}
      <div className="glass rim relative overflow-hidden p-6 text-center">
        <div className="t-freq grad-primary glow-cyan text-[3rem] leading-none">
          {tone.frequency}
          <span className="ml-1 text-[1.1rem] text-ink-faint">Hz</span>
        </div>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-mute">{tone.description}</p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={toggle}
            className={cn("btn btn-primary grid size-20 place-items-center rounded-full", isPlaying && "pulse-orb")}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-7" fill="currentColor" />
            ) : (
              <Play className="ml-1 size-7" fill="currentColor" />
            )}
          </button>
        </div>

        <div className="mt-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-hairline/60">
            <div
              className="h-full rounded-full bg-cyan transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[0.7rem] text-ink-faint">
            <span className="t-freq">{formatClock(elapsed)}</span>
            <span className="t-freq">-{formatClock(remaining)}</span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-magenta/25 bg-magenta/8 p-3.5">
          <p className="text-[0.78rem] leading-relaxed text-ink-soft">{notice}</p>
          <button onClick={() => setNotice(null)} className="shrink-0 text-[0.7rem] text-ink-faint hover:text-ink">
            Close
          </button>
        </div>
      )}

      {mode === "isochronic" && (
        <div className="glass mt-4 p-4">
          <p className="text-[0.78rem] leading-relaxed text-ink-mute">
            {tone.frequency.toLocaleString()} Hz is above the binaural range, so this session is delivered as an
            isochronic pulse, one tone switched on and off at {tone.frequency.toLocaleString()} Hz, instead of two
            carrier tones.
          </p>
        </div>
      )}

      <div className="glass mt-4 flex items-center gap-3 p-4">
        <Headphones className="size-4 shrink-0 text-cyan" strokeWidth={1.9} />
        <p className="text-[0.76rem] leading-relaxed text-ink-mute">
          Headphones are required. Both ears need to hear a separate signal for this to work.
        </p>
      </div>

      <div className="mt-6">
        <p className="t-label">Duration</p>
        <div className="mt-3 flex gap-2">
          {DURATIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className="chip flex-1 justify-center"
              data-active={minutes === m ? "true" : undefined}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <MixPanel className="mt-6" mix={mix} onChange={changeMix} padActive={ambient !== null} />

      <div className="mt-6">
        <p className="t-label">Synth pad bed</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              padTouchedRef.current = true;
              setAmbient(null);
            }}
            className="glass glass-hover p-3 text-left"
            style={
              ambient === null
                ? { borderColor: "color-mix(in oklch, var(--color-cyan) 55%, transparent)" }
                : undefined
            }
          >
            <div className="text-[0.8rem] font-medium text-ink">None</div>
            <div className="mt-0.5 text-[0.68rem] text-ink-faint">Tone only</div>
          </button>
          {AMBIENT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                padTouchedRef.current = true;
                setAmbient(p.id);
                preloadAmbient(p.id);
              }}
              className="glass glass-hover p-3 text-left"
              style={
                ambient === p.id
                  ? { borderColor: `color-mix(in oklch, ${p.accent} 60%, transparent)` }
                  : undefined
              }
            >
              <div className="text-[0.8rem] font-medium text-ink">{p.name}</div>
              <div className="mt-0.5 text-[0.68rem] text-ink-faint">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      {tone.benefits.length > 0 && (
        <div className="mt-6">
          <p className="t-label">Benefits</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tone.benefits.map((b) => (
              <span key={b} className="chip">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
