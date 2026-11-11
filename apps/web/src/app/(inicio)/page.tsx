import type { Metadata } from "next";
import { Estatisticas } from "@/componentes/Estatisticas";
import { buscarOferta, type Oferta } from "@/lib/oferta";
import { linkDoSuporteParaVisitantes } from "@/lib/suporte";
import { Abertura } from "./abertura";
import { Cabecalho } from "./cabecalho";
import { ChamadaFinal } from "./chamadaFinal";
import { Fases } from "./fases";
import { Perguntas } from "./perguntas";
import { Preco } from "./preco";
import { Recursos } from "./recursos";
import { Rodape } from "./rodape";
import { WhatsAppFlutuante } from "./whatsAppFlutuante";

const TITULO = "Reparium · Sistema de ordem de serviço para assistência técnica de celular";

function descricao(diasDeTeste: number): string {
  return `Organize as ordens de serviço da sua assistência e deixe o cliente acompanhar o conserto pelo celular, sem instalar nada. ${diasDeTeste} dias grátis, sem cartão de crédito.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const { dias_de_teste } = await buscarOferta();
  return {
    title: TITULO,
    description: descricao(dias_de_teste),
    alternates: { canonical: "/" },
    openGraph: {
      title: TITULO,
      description: descricao(dias_de_teste),
      siteName: "Reparium",
      locale: "pt_BR",
      type: "website",
      url: "/",
    },
  };
}

function dadosEstruturados(oferta: Oferta): string {
  const mensais = oferta.planos.map((plano) => Number(plano.mensal));
  const menorPreco = Math.min(...mensais).toFixed(2);
  const maiorPreco = Math.max(...mensais).toFixed(2);
  const dados = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Reparium",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: descricao(oferta.dias_de_teste),
    offers: {
      "@type": "AggregateOffer",
      lowPrice: menorPreco,
      highPrice: maiorPreco,
      priceCurrency: "BRL",
      offerCount: oferta.planos.length,
    },
  };
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}

export default async function PaginaInicial() {
  const oferta = await buscarOferta();
  const whatsapp = linkDoSuporteParaVisitantes();

  return (
    <div className="bg-superficie">
      <Cabecalho />
      <main>
        <Abertura diasDeTeste={oferta.dias_de_teste} />
        <Recursos />
        <Fases />
        <Preco oferta={oferta} />
        <Perguntas diasDeTeste={oferta.dias_de_teste} whatsapp={whatsapp} />
        <ChamadaFinal diasDeTeste={oferta.dias_de_teste} />
      </main>
      <Rodape whatsapp={whatsapp} />
      {whatsapp && <WhatsAppFlutuante link={whatsapp} />}
      <Estatisticas />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: dadosEstruturados(oferta) }}
      />
    </div>
  );
}
