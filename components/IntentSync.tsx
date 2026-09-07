"use client";

/**
 * Bridges the onboarding intent captured before sign-in (in localStorage) onto
 * the user's profile once they authenticate. Runs once per device after the
 * first successful sync, so it is effectively a no-op on every later load.
 */

import { useEffect } from "react";
import { loadIntent, markOnboarded } from "@/lib/intent";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const SYNCED_KEY = "qt.intent.synced.v1";

export function IntentSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      if (window.localStorage.getItem(SYNCED_KEY)) return;
    } catch {
      return;
    }

    let active = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await createClient().auth.getUser();
        if (!active || !user) return;

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ intent: loadIntent() }),
        });
        if (res.ok) {
          markOnboarded();
          window.localStorage.setItem(SYNCED_KEY, "1");
        }
      } catch {
        /* best-effort, retried on next load */
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
