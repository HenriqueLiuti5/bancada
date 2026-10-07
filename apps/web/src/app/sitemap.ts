import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const enderecoPublico = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";
  return [
    { url: `${enderecoPublico}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${enderecoPublico}/cadastro`, changeFrequency: "yearly", priority: 0.5 },
  ];
}
