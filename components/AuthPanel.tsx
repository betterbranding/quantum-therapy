"use client";

import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <div className="rise glass mt-6 p-6 text-center" style={{ animationDelay: "0.05s" }}>
        <p className="t-label">Welcome</p>
        <h2 className="t-display mt-2 text-[1.2rem] text-ink">Sign-in is not configured</h2>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-mute">
          This environment has not been connected to an account system yet. Check back soon.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(authError.message);
        setOauthLoading(false);
      }
    } catch {
      setError("Unable to reach the sign-in provider.");
      setOauthLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rise glass mt-6 p-6 text-center" style={{ animationDelay: "0.05s" }}>
        <CheckCircle2 className="mx-auto size-6 text-cyan" />
        <h2 className="t-display mt-3 text-[1.2rem] text-ink">Check your inbox</h2>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-mute">
          We sent a sign-in link to {email.trim()}. Open it on this device to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <div className="rise glass mt-6 p-6" style={{ animationDelay: "0.05s" }}>
      <p className="t-label">Welcome</p>
      <h2 className="t-display mt-2 text-[1.4rem] text-ink">Sign in to continue</h2>
      <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-mute">
        Track sessions, save favorites and manage your plan.
      </p>

      <form onSubmit={submit} className="mt-5">
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-[16px] -translate-y-1/2 text-ink-faint" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input py-3.5 pr-4 pl-11 text-[0.88rem]"
            autoComplete="email"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary mt-3 w-full py-3.5 text-[0.72rem]">
          {loading ? "Sending..." : "Send sign-in link"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-[0.65rem] tracking-[0.16em] text-ink-faint uppercase">Or</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>

      <button onClick={google} disabled={oauthLoading} className="btn btn-ghost w-full py-3.5 text-[0.72rem]">
        {oauthLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      {error && <p className="mt-4 text-center text-[0.75rem] text-magenta">{error}</p>}
    </div>
  );
}
