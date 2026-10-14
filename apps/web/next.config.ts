import type { NextConfig } from "next";
import { TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES } from "./src/lib/fotos";

const DESENVOLVIMENTO = process.env.NODE_ENV === "development";

const POLITICA_DE_CONTEUDO = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DESENVOLVIMENTO ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${DESENVOLVIMENTO ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: { position: "bottom-left" },
  experimental: {
    serverActions: { bodySizeLimit: TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES },
    proxyClientMaxBodySize: TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES,
    optimizePackageImports: ["@phosphor-icons/react/ssr"],
  },
  async headers() {
    return [
      {
        source: "/:caminho*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/:caminho((?!ordens/[^/]+/documentos/).*)",
        headers: [{ key: "Content-Security-Policy", value: POLITICA_DE_CONTEUDO }],
      },
    ];
  },
};

export default nextConfig;
