import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Clock, Layers, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProtocolPlayer } from "@/components/ProtocolPlayer";
import { getLocalBySlug, localProtocols, estimateDuration } from "@/lib/protocols";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDuration, formatHz } from "@/lib/utils";
import type { Profile, Protocol, TierId } from "@/lib/supabase/types";

type ProtocolPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * The page reads the signed-in viewer's tier from cookies, so it renders per
 * request rather than at build time. Metadata is still fully static, which is
 * what search engines index.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProtocolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const protocol = getLocalBySlug(slug);
  if (!protocol) return { title: "Protocol not found" };

  const count = protocol.frequencies.length;
  const preview = protocol.frequencies.slice(0, 6).map(formatHz).join(", ");

  return {
    title: `${protocol.name} Rife Frequencies`,
    description: `${count} Rife frequencies for ${protocol.name} from the Consolidated Annotated Frequency List: ${preview}${count > 6 ? " and more" : ""}. Play the full protocol as a binaural beat session.`,
    alternates: { canonical: `/protocol/${protocol.slug}` },
    openGraph: {
      title: `${protocol.name}: ${count} Rife frequencies`,
      description: `Play the ${protocol.name} CAFL protocol as a guided binaural beat session.`,
      type: "article",
    },
  };
}

export default async function ProtocolPage({ params }: ProtocolPageProps) {
  const { slug } = await params;
  const protocol = getLocalBySlug(slug);
  if (!protocol) notFound();

  const { tier, signedIn } = await readViewer();

  const related = localProtocols()
    .filter((p) => p.category === protocol.category && p.slug !== protocol.slug)
    .slice(0, 6);

  const fullSessionSeconds = estimateDuration(protocol);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${protocol.name} Rife Frequency Protocol`,
    description:
      protocol.description ??
      `Rife frequency protocol for ${protocol.name} from the Consolidated Annotated Frequency List.`,
    about: { "@type": "MedicalCondition", name: protocol.name },
    isPartOf: { "@type": "WebSite", name: "Quantum Therapy" },
  };

  return (
    <div className="px-5 pt-3 pb-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        eyebrow={protocol.category}
        title={protocol.name}
        backHref="/search"
        backLabel="Library"
      />

      {protocol.aliases.length > 0 && (
        <p className="mt-2 text-[0.78rem] leading-relaxed text-ink-faint">
          Also listed as {protocol.aliases.slice(0, 4).join(", ")}
        </p>
      )}

      <section className="rise mt-5 grid grid-cols-3 gap-2.5" style={{ animationDelay: "0.05s" }}>
        <Stat icon={<Activity className="size-3.5" />} value={String(protocol.frequencies.length)} label="Frequencies" />
        <Stat icon={<Clock className="size-3.5" />} value={formatDuration(fullSessionSeconds)} label="Full Session" />
        <Stat icon={<Layers className="size-3.5" />} value={protocol.source} label="Source" />
      </section>

      {protocol.description && (
        <p
          className="rise mt-5 text-[0.86rem] leading-relaxed text-ink-soft"
          style={{ animationDelay: "0.08s" }}
        >
          {protocol.description}
        </p>
      )}

      {protocol.notes && !(protocol.description ?? "").includes(protocol.notes) && (
        <div className="glass rise mt-4 flex gap-3 p-4" style={{ animationDelay: "0.1s" }}>
          <Info className="mt-0.5 size-4 shrink-0 text-cyan" />
          <p className="text-[0.8rem] leading-relaxed text-ink-mute">{protocol.notes}</p>
        </div>
      )}

      <div className="rise mt-6" style={{ animationDelay: "0.12s" }}>
        <ProtocolPlayer protocol={protocol} tier={tier} signedIn={signedIn} />
      </div>

      {related.length > 0 && (
        <section className="rise mt-8" style={{ animationDelay: "0.18s" }}>
          <p className="t-label">More in {protocol.category}</p>
          <div className="mt-3 space-y-2.5">
            {related.map((p) => (
              <RelatedRow key={p.slug} protocol={p} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-[0.68rem] leading-relaxed text-ink-faint">
        Rife frequency protocols are experimental and are not a medical treatment, diagnosis or cure.
        Quantum Therapy is for wellness and relaxation only. Talk to a licensed clinician about any
        medical condition, and do not use frequency sessions in place of care you need.
      </p>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass px-2 py-3.5 text-center">
      <div className="flex items-center justify-center text-cyan">{icon}</div>
      <div className="t-freq mt-1.5 text-[0.95rem] leading-none text-ink">{value}</div>
      <div className="mt-1.5 text-[0.55rem] font-medium tracking-[0.16em] uppercase text-ink-faint">
        {label}
      </div>
    </div>
  );
}

function RelatedRow({ protocol }: { protocol: Protocol }) {
  return (
    <Link
      href={`/protocol/${protocol.slug}`}
      className="glass glass-hover flex items-center justify-between gap-4 p-4"
    >
      <span className="truncate text-[0.85rem] text-ink">{protocol.name}</span>
      <span className="t-freq shrink-0 text-[0.72rem] text-cyan">
        {protocol.frequencies.length} Hz steps
      </span>
    </Link>
  );
}

async function readViewer(): Promise<{ tier: TierId; signedIn: boolean }> {
  if (!isSupabaseConfigured()) return { tier: "free", signedIn: false };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { tier: "free", signedIn: false };

    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier = (data as Pick<Profile, "subscription_tier"> | null)?.subscription_tier ?? "free";
    return { tier, signedIn: true };
  } catch {
    return { tier: "free", signedIn: false };
  }
}
