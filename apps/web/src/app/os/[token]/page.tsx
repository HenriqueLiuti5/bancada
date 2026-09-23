import type { Metadata } from "next";
import Image from "next/image";
import { enderecoDaFoto } from "@/lib/fotos";
import { buscarAcompanhamento, type EtapaPublica, type FotoPublica } from "@/lib/publico";

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
  });
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{texto}</p>
    </main>
  );
}

function Foto({ foto }: { foto: FotoPublica }) {
  return (
    <figure className="space-y-1">
      <Image
        src={enderecoDaFoto(foto.assinatura)}
        alt={foto.legenda || `Foto do aparelho ${foto.momento_rotulo.toLowerCase()}`}
        width={foto.largura}
        height={foto.altura}
        unoptimized
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
      />
      <figcaption className="text-xs text-neutral-500 dark:text-neutral-400">
        {foto.momento_rotulo}
        {foto.legenda && ` · ${foto.legenda}`}
      </figcaption>
    </figure>
  );
}

function Etapa({ etapa, atual }: { etapa: EtapaPublica; atual: boolean }) {
  return (
    <li className="relative pl-7">
      <span
        className={
          atual
            ? "absolute top-1 left-0 size-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
            : "absolute top-1.5 left-[3px] size-2 rounded-full bg-neutral-300 dark:bg-neutral-700"
        }
      />
      <p className={atual ? "text-sm font-medium" : "text-sm"}>{etapa.rotulo}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {formatarMomento(etapa.em)}
      </p>
    </li>
  );
}

export default async function Acompanhamento({ params }: Props) {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo === "inexistente") {
    return (
      <Aviso
        titulo="Link não encontrado"
        texto="Confira se o endereço foi copiado por inteiro, ou fale com a assistência."
      />
    );
  }

  if (resultado.tipo === "expirado") {
    return (
      <Aviso
        titulo="Link expirado"
        texto="Este acompanhamento não está mais disponível. Fale com a assistência se precisar."
      />
    );
  }

  if (resultado.tipo === "indisponivel") {
    return (
      <Aviso
        titulo="Serviço indisponível"
        texto="Não conseguimos carregar o acompanhamento agora. Tente novamente em instantes."
      />
    );
  }

  const { dados } = resultado;
  const ultima = dados.linha_do_tempo.length - 1;

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
          {dados.assistencia.nome}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {dados.cliente_primeiro_nome}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Acompanhe o reparo do seu {dados.aparelho}
        </p>
      </header>

      <section
        className={
          dados.encerrada
            ? "rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-5 dark:border-neutral-800 dark:bg-neutral-900"
            : "rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-5"
        }
      >
        <p className="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
          Situação agora
        </p>
        <p className="mt-1 text-xl font-semibold">{dados.status_rotulo}</p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{dados.mensagem}</p>
      </section>

      {dados.orcamento && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Orçamento</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {dados.orcamento.itens.map((item) => (
                <li
                  key={item.descricao}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                >
                  <span>{item.descricao}</span>
                  <span className="text-neutral-500 dark:text-neutral-400">R$ {item.valor}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-4 border-t border-neutral-200 px-5 py-3 text-sm font-medium dark:border-neutral-800">
              <span>Total</span>
              <span>R$ {dados.orcamento.total}</span>
            </div>
          </div>
        </section>
      )}

      {dados.fotos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Fotos do aparelho</h2>
          <div className="grid grid-cols-2 gap-3">
            {dados.fotos.map((foto) => (
              <Foto key={foto.assinatura} foto={foto} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Andamento</h2>
        <ol className="space-y-4 border-l border-neutral-200 pl-1 dark:border-neutral-800">
          {dados.linha_do_tempo.map((etapa, indice) => (
            <Etapa key={etapa.em} etapa={etapa} atual={indice === ultima} />
          ))}
        </ol>
      </section>

      <footer className="space-y-2 border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800">
        <p className="text-neutral-500 dark:text-neutral-400">
          Ordem de serviço nº {dados.numero} · aberta em {formatarMomento(dados.aberta_em)}
        </p>
        {dados.assistencia.telefone && (
          <a
            href={`tel:${dados.assistencia.telefone}`}
            className="inline-block font-medium underline underline-offset-4"
          >
            Falar com a assistência
          </a>
        )}
      </footer>
    </main>
  );
}
