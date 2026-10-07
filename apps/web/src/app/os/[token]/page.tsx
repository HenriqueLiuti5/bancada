import type { Metadata } from "next";
import { Acompanhamento as PaginaDoCliente } from "@/componentes/Acompanhamento";
import { CloudSlashIcon, HourglassLowIcon, LinkBreakIcon } from "@/componentes/icones";
import { enderecoDaLogo } from "@/lib/logo";
import { buscarAcompanhamento, nomeParaOCliente } from "@/lib/publico";

export const dynamic = "force-dynamic";

const ENDERECO_PUBLICO = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo !== "ok") {
    return { title: "Acompanhamento · Bancada", robots: { index: false, follow: false } };
  }

  const { dados } = resultado;
  const { logo } = dados.assistencia;
  return {
    title: `${dados.aparelho} · ${dados.status_rotulo}`,
    description: dados.mensagem,
    robots: { index: false, follow: false },
    openGraph: {
      title: nomeParaOCliente(dados.assistencia),
      description: `${dados.aparelho} · ${dados.status_rotulo}. ${dados.mensagem}`,
      siteName: dados.assistencia.nome,
      type: "website",
      images: logo
        ? [
            {
              url: `${ENDERECO_PUBLICO}${enderecoDaLogo(logo.assinatura)}`,
              width: logo.largura,
              height: logo.altura,
              alt: dados.assistencia.nome,
            },
          ]
        : undefined,
    },
  };
}

function Aviso({
  icone,
  titulo,
  texto,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="text-icone">{icone}</span>
        <h1 className="mt-4 text-xl leading-tight font-bold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-[15px] text-texto-apagado">{texto}</p>
      </div>
    </main>
  );
}

export default async function Acompanhamento({ params }: Props) {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo === "inexistente") {
    return (
      <Aviso
        icone={<LinkBreakIcon size={44} weight="light" />}
        titulo="Link não encontrado"
        texto="Confira se o endereço foi copiado por inteiro, ou fale com a assistência."
      />
    );
  }

  if (resultado.tipo === "expirado") {
    return (
      <Aviso
        icone={<HourglassLowIcon size={44} weight="light" />}
        titulo="Link expirado"
        texto="Este acompanhamento não está mais disponível. Fale com a assistência se precisar."
      />
    );
  }

  if (resultado.tipo === "indisponivel") {
    return (
      <Aviso
        icone={<CloudSlashIcon size={44} weight="light" />}
        titulo="Serviço indisponível"
        texto="Não conseguimos carregar o acompanhamento agora. Tente novamente em instantes."
      />
    );
  }

  return <PaginaDoCliente dados={resultado.dados} />;
}
