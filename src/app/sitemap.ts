import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://downrail.vercel.app";
  return [{ url: origin, changeFrequency: "daily", priority: 1 }];
}
