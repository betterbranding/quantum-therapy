import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AuthPanel } from "@/components/AuthPanel";
import { AccountPanel } from "@/components/AccountPanel";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [{ data: profileData }, { data: used }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.rpc("sessions_this_month", { uid: user.id }),
      ]);
      const profile = profileData as Profile | null;

      return (
        <div className="px-5 pt-3 pb-4">
          <PageHeader eyebrow="Account" title="Profile" />
          <AccountPanel
            email={user.email ?? profile?.email ?? null}
            fullName={profile?.full_name ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            tier={profile?.subscription_tier ?? "free"}
            sessionsUsed={Number(used ?? 0)}
          />
          <SettingsList />
        </div>
      );
    }
  }

  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow="Account" title="Profile" />
      <AuthPanel />
      <SettingsList />
    </div>
  );
}

function SettingsList() {
  const items = [
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms of service" },
    { href: "mailto:hello@thebetterbranding.com", label: "Contact support" },
  ];

  return (
    <section className="rise mt-8" style={{ animationDelay: "0.2s" }}>
      <p className="t-label">Settings</p>
      <div className="mt-4 space-y-2.5">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="glass glass-hover flex items-center justify-between p-4">
            <span className="text-[0.85rem] text-ink">{item.label}</span>
            <ChevronRight className="size-4 text-ink-faint" />
          </Link>
        ))}
      </div>
      <div className="mt-5 text-center text-[0.68rem] leading-relaxed text-ink-faint">
        <p>Quantum Therapy v1.0.0</p>
        <p className="mt-1">Better Branding LLC, 8376 Davis Blvd #229, NRH, TX 76182</p>
      </div>
    </section>
  );
}
