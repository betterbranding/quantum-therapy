import type { MetadataRoute } from "next";
import { localProtocols, LOCAL_TONES } from "@/lib/protocols";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantumtherapy.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/frequencies`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const tones: MetadataRoute.Sitemap = LOCAL_TONES.map((t) => ({
    url: `${siteUrl}/frequency/${t.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const protocols: MetadataRoute.Sitemap = localProtocols().map((p) => ({
    url: `${siteUrl}/protocol/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...tones, ...protocols];
}
