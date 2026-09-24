import { CloudOff, Link2Off, Phone, TimerOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { Cartao } from "@/componentes/ui/Cartao";
import { LinhaDoTempo } from "@/componentes/ui/LinhaDoTempo";
import { PontoDeStatus } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { FUSO_HORARIO } from "@/lib/datas";
import { enderecoDaFoto } from "@/lib/fotos";
import { emReais } from "@/lib/moeda";
import { buscarAcompanhamento, type FotoPublica } from "@/lib/publico";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo !== "ok") {
    return { title: "Acompanhamento · Bancada" };
  }

  const { dados } = resultado;
  return {
    title: `${dados.aparelho} · ${dados.status_rotulo}`,
    description: dados.mensagem,
    openGraph: {
      title: `${dados.aparelho} · ${dados.status_rotulo}`,
      description: dados.mensagem,
      siteName: dados.assistencia.nome,
      type: "website",
    },
  };
}

function formatarMomento(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_HORARIO,
  });
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-full border border-borda bg-superficie text-texto-suave shadow-sutil">
          {icone}
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">{titulo}</h1>
          <p className="text-sm text-texto-suave">{texto}</p>
        </div>
      </div>
    </main>
  );
}

function Foto({ foto }: { foto: FotoPublica }) {
  return (
    <figure className="space-y-1.5">
      <Image
        src={enderecoDaFoto(foto.assinatura)}
        alt={foto.legenda || `Foto do aparelho ${foto.momento_rotulo.toLowerCase()}`}
        width={foto.largura}
        height={foto.altura}
        unoptimized
        className="aspect-[4/3] w-full rounded-lg border border-borda object-cover"
      />
      <figcaption className="text-xs text-texto-suave">
        {foto.momento_rotulo}
        {foto.legenda && ` · ${foto.legenda}`}
      </figcaption>
    </figure>
  );
}

export default async function Acompanhamento({ params }: Props) {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo === "inexistente") {
    return (
      <Aviso
        icone={<Link2Off size={18} strokeWidth={1.75} />}
        titulo="Link não encontrado"
        texto="Confira se o endereço foi copiado por inteiro, ou fale com a assistência."
      />
    );
  }

  if (resultado.tipo === "expirado") {
    return (
      <Aviso
        icone={<TimerOff size={18} strokeWidth={1.75} />}
        titulo="Link expirado"
        texto="Este acompanhamento não está mais disponível. Fale com a assistência se precisar."
      />
    );
  }

  if (resultado.tipo === "indisponivel") {
    return (
      <Aviso
        icone={<CloudOff size={18} strokeWidth={1.75} />}
        titulo="Serviço indisponível"
        texto="Não conseguimos carregar o acompanhamento agora. Tente novamente em instantes."
      />
    );
  }

  const { dados } = resultado;
  const ultima = dados.linha_do_tempo.length - 1;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10 sm:py-14">
      <header className="space-y-3">
        <p className="text-[13px] font-medium text-texto-suave">{dados.assistencia.nome}</p>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {dados.cliente_primeiro_nome}
          </h1>
          <p className="text-sm text-texto-suave">Acompanhe o reparo do seu {dados.aparelho}.</p>
        </div>
      </header>

      <section className="rounded-xl border border-borda bg-superficie p-5 shadow-sutil">
        <p className="text-[13px] text-texto-suave">Situação agora</p>
        <p className="mt-1.5 flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <PontoDeStatus status={dados.status} tamanho="md" />
          {dados.status_rotulo}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-texto-suave">{dados.mensagem}</p>
      </section>

      {dados.orcamento && (
        <Cartao titulo={dados.orcamento.aprovado ? "Orçamento aprovado" : "Orçamento"} semEspaco>
          <ul className="divide-y divide-borda">
            {dados.orcamento.itens.map((item, indice) => (
              <li
                key={indice}
                className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm"
              >
                <span>{item.descricao}</span>
                <span className="text-texto-suave tabular-nums">
                  {emReais(item.valor)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-borda bg-realce px-5 py-2.5 text-sm font-medium">
            <span>Total</span>
            <span className="tabular-nums">{emReais(dados.orcamento.total)}</span>
          </div>
        </Cartao>
      )}

      {dados.fotos.length > 0 && (
        <Cartao titulo="Fotos do aparelho">
          <div className="grid grid-cols-2 gap-3">
            {dados.fotos.map((foto) => (
              <Foto key={foto.assinatura} foto={foto} />
            ))}
          </div>
        </Cartao>
      )}

      <Cartao titulo="Andamento">
        <LinhaDoTempo
          etapas={dados.linha_do_tempo.map((etapa, indice) => ({
            chave: `${etapa.status}-${etapa.em}`,
            status: etapa.status,
            titulo: etapa.rotulo,
            detalhes: formatarMomento(etapa.em),
            atual: indice === ultima,
          }))}
        />
      </Cartao>

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-xs text-texto-apagado">
          Ordem de serviço nº {dados.numero} · aberta em {formatarMomento(dados.aberta_em)}
        </p>
        {dados.assistencia.telefone && (
          <a href={`tel:${dados.assistencia.telefone}`} className={botao("secundario", "sm")}>
            <Phone size={14} strokeWidth={2} />
            Falar com a assistência
          </a>
        )}
      </footer>
    </main>
  );
}
