import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const enderecoPublico = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/os/", "/fotos/", "/logos/", "/webhooks/"] },
    sitemap: `${enderecoPublico}/sitemap.xml`,
  };
}
