import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocalTone, LOCAL_TONES } from "@/lib/protocols";
import { TonePlayer } from "@/components/TonePlayer";
import { PageHeader } from "@/components/PageHeader";

type FrequencyPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return LOCAL_TONES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: FrequencyPageProps): Promise<Metadata> {
  const { id } = await params;
  const tone = getLocalTone(id);
  if (!tone) return { title: "Frequency not found" };
  return {
    title: tone.name,
    description: `${tone.frequency} Hz, ${tone.category}. ${tone.description}`,
  };
}

export default async function FrequencyPage({ params }: FrequencyPageProps) {
  const { id } = await params;
  const tone = getLocalTone(id);
  if (!tone) notFound();

  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow={tone.category} title={tone.name} backHref="/frequencies" backLabel="Tones" />
      <TonePlayer tone={tone} />
    </div>
  );
}
