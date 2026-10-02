import type { NextConfig } from "next";
import { TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES } from "./src/lib/fotos";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: { position: "bottom-right" },
  experimental: {
    serverActions: { bodySizeLimit: TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES },
    proxyClientMaxBodySize: TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES,
  },
};

export default nextConfig;
