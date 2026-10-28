import Script from "next/script";
import { estatisticasLigadas, idDoSite } from "@/lib/estatisticas";

// Só nas páginas abertas a todos: dentro do sistema e nos links com código secreto, nunca.
export function Estatisticas() {
  const site = idDoSite();
  if (!site || !estatisticasLigadas()) return null;

  return (
    <Script
      src="/estatisticas/contador"
      data-website-id={site}
      data-do-not-track="true"
      strategy="afterInteractive"
    />
  );
}
