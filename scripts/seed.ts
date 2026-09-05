import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import rawProtocols from "../data/protocols.json";
import { TONES } from "../data/tones";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trim().startsWith("#") || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value.replace(/\\n/g, "\n");
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Supabase seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local or the environment.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type ProtocolSeed = {
  slug: string;
  name: string;
  category: string;
  aliases: string[];
  frequencies: number[];
  notes?: string;
  description?: string;
};

async function seed() {
  const protocols = rawProtocols as ProtocolSeed[];
  const batchSize = 250;
  let protocolCount = 0;
  for (let index = 0; index < protocols.length; index += batchSize) {
    const batch = protocols.slice(index, index + batchSize).map((protocol) => ({
      slug: protocol.slug,
      name: protocol.name,
      category: protocol.category,
      aliases: protocol.aliases ?? [],
      frequencies: protocol.frequencies,
      notes: protocol.notes || null,
      description: protocol.description || null,
      source: "CAFL",
    }));
    const { error } = await supabase.from("protocols").upsert(batch, { onConflict: "slug" });
    if (error) throw new Error(`Protocol batch ${index / batchSize + 1} failed: ${error.message}`);
    protocolCount += batch.length;
    console.log(`Seeded ${protocolCount}/${protocols.length} protocols`);
  }

  const tones = TONES.map((tone, sort_order) => ({ ...tone, sort_order }));
  const { error: toneError } = await supabase.from("tones").upsert(tones, { onConflict: "id" });
  if (toneError) throw new Error(`Tone seed failed: ${toneError.message}`);

  console.log(`Seed complete: ${protocolCount} protocols and ${tones.length} tones.`);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
