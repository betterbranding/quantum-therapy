import type { Metadata } from "next";
import { SearchView } from "@/components/SearchView";
import { scoreLocal, localProtocols } from "@/lib/protocols";

export const metadata: Metadata = {
  title: "Search",
  description: "Search 1,395 Rife frequency protocols by condition, alias or category.",
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string; category?: string; tab?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  const category = params.category ?? "";
  const tab = params.tab === "tones" ? "tones" : "protocols";

  const initialResults = (q.trim() ? scoreLocal(q, 40) : localProtocols())
    .filter((p) => !category || p.category === category)
    .slice(0, 40)
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category, count: p.frequencies.length }));

  return (
    <div className="px-5 pt-3">
      <SearchView initialQuery={q} initialCategory={category} initialTab={tab} initialResults={initialResults} />
    </div>
  );
}
