import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Lock, ListMusic } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import type { Profile, SessionRow, Favorite } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  if (!isSupabaseConfigured()) return <SignedOutState />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <SignedOutState />;

  const [{ data: profile }, { data: monthCount }, { data: allSessions }, { data: history }, { data: favorites }] =
    await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
      supabase.rpc("sessions_this_month", { uid: user.id }),
      supabase.from("sessions").select("id, duration_secs").eq("user_id", user.id),
      supabase
        .from("sessions")
        .select("id, title, frequencies, duration_secs, completed, ambient_preset, started_at, protocol_id, tone_id")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("favorites")
        .select("user_id, protocol_id, tone_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const tier = (profile as Pick<Profile, "subscription_tier"> | null)?.subscription_tier ?? "free";
  const rows = (allSessions ?? []) as Pick<SessionRow, "id" | "duration_secs">[];
  const historyRows = (history ?? []) as SessionRow[];
  const favoriteRows = (favorites ?? []) as Favorite[];

  const totalSessions = rows.length;
  const totalSeconds = rows.reduce((a, r) => a + (r.duration_secs ?? 0), 0);
  const thisMonth = Number(monthCount ?? 0);
  const isPremium = tier === "premium";

  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow="Your Practice" title="Sessions" />

      <section className="rise mt-6 grid grid-cols-3 gap-2.5" style={{ animationDelay: "0.05s" }}>
        {[
          { value: thisMonth.toString(), label: "This Month" },
          { value: totalSessions.toString(), label: "Total Sessions" },
          { value: formatDuration(totalSeconds), label: "Total Time" },
        ].map((s) => (
          <div key={s.label} className="glass px-2 py-4 text-center">
            <div className="t-freq grad-cyan text-[1.25rem] leading-none">{s.value}</div>
            <div className="mt-1.5 text-[0.575rem] font-medium tracking-[0.16em] uppercase text-ink-faint">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      <section className="rise mt-8" style={{ animationDelay: "0.1s" }}>
        <p className="t-label">Favorites</p>
        <h2 className="t-display mt-2 text-[1.5rem] text-ink">Saved</h2>
        {favoriteRows.length === 0 ? (
          <div className="glass mt-4 p-5 text-center">
            <Heart className="mx-auto size-5 text-ink-faint" />
            <p className="mt-2 text-[0.8rem] text-ink-mute">
              Favorite a protocol or tone from its page and it will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {favoriteRows.map((f) => (
              <div key={`${f.protocol_id ?? f.tone_id}`} className="glass glass-hover flex items-center gap-3 p-4">
                <Heart className="size-4 shrink-0 text-magenta" fill="currentColor" />
                <span className="truncate text-[0.85rem] text-ink">
                  {f.protocol_id ? `Protocol #${f.protocol_id}` : `Tone: ${f.tone_id}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rise mt-8" style={{ animationDelay: "0.16s" }}>
        <p className="t-label">History</p>
        <h2 className="t-display mt-2 text-[1.5rem] text-ink">Recent sessions</h2>

        {!isPremium ? (
          <Link href="/pricing" className="glass glass-hover mt-4 block p-6 text-center">
            <Lock className="mx-auto size-5 text-cyan" />
            <p className="t-display mt-3 text-[1.05rem] text-ink">Session history is a Premium feature</p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-mute">
              Upgrade to Premium to see every session you have ever run, with duration, frequencies and ambient
              preset.
            </p>
            <span className="btn btn-primary mt-4 inline-flex px-6 py-2.5 text-[0.7rem]">View Premium</span>
          </Link>
        ) : historyRows.length === 0 ? (
          <div className="glass mt-4 p-5 text-center">
            <ListMusic className="mx-auto size-5 text-ink-faint" />
            <p className="mt-2 text-[0.8rem] text-ink-mute">No sessions yet. Start one from the library.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {historyRows.map((s) => (
              <div key={s.id} className="glass glass-hover flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="truncate text-[0.85rem] font-medium text-ink">{s.title}</div>
                  <div className="mt-1 text-[0.7rem] text-ink-faint">
                    {new Date(s.started_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {s.completed ? "" : ", incomplete"}
                  </div>
                </div>
                <span className="t-freq shrink-0 text-[0.78rem] text-cyan">{formatDuration(s.duration_secs)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SignedOutState() {
  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow="Your Practice" title="Sessions" />
      <div className="glass rise mt-8 p-6 text-center" style={{ animationDelay: "0.1s" }}>
        <ListMusic className="mx-auto size-6 text-cyan" />
        <h2 className="t-display mt-4 text-[1.3rem] text-ink">Track every session</h2>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-mute">
          Sign in to save favorites, track your monthly usage and, on Premium, keep a full history of every
          protocol and tone you have played.
        </p>
        <Link href="/profile" className="btn btn-primary mt-5 inline-flex px-6 py-3 text-[0.72rem]">
          Sign in
        </Link>
      </div>
    </div>
  );
}
