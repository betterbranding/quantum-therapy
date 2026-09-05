import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { localProtocols, scoreLocal } from "@/lib/protocols";
import type { Protocol } from "@/lib/supabase/types";

export const runtime = "nodejs";

type SearchResult = Pick<Protocol, "slug" | "name" | "category" | "frequencies"> & { count: number };

function parsedLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 40;
}

function format(protocols: Protocol[]): SearchResult[] {
  return protocols.map(({ slug, name, category, frequencies }) => ({
    slug,
    name,
    category,
    frequencies,
    count: frequencies.length,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const limit = parsedLimit(searchParams.get("limit"));

  const local = () => {
    const source = q.trim() ? scoreLocal(q, limit) : localProtocols();
    return source.filter((protocol) => !category || protocol.category === category).slice(0, limit);
  };

  if (!isSupabaseConfigured()) return NextResponse.json({ results: format(local()) });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_protocols", { q, lim: limit });
    if (error) throw error;
    const results = ((data ?? []) as Protocol[]).filter(
      (protocol) => !category || protocol.category === category,
    );
    return NextResponse.json({ results: format(results) });
  } catch {
    return NextResponse.json({ results: format(local()) });
  }
}
