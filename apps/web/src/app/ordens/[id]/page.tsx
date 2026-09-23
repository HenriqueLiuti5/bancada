import Link from "next/link";
import { CompartilharLink } from "@/componentes/CompartilharLink";
import { Selo } from "@/componentes/Selo";
import { chamarApi } from "@/lib/api";
import type { Ordem } from "@/lib/tipos";
import { AcoesDeStatus } from "./acoesDeStatus";
import { FotosDaOrdem } from "./fotosDaOrdem";

export const dynamic = "force-dynamic";

const STATUS_COM_RECIBO = ["pronto", "entregue", "devolvido_sem_reparo"];

const BOTAO_DE_DOCUMENTO =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-300";

function formatarMomento(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DetalheDaOrdem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ordem = await chamarApi<Ordem>(`/api/ordens/${id}/`);
  const base = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";
  const linkDoCliente = `${base}/os/${ordem.token_publico}`;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/ordens"
          className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
        >
          ← Todas as ordens
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">OS #{ordem.numero}</h1>
            <Selo status={ordem.status} rotulo={ordem.status_label} />
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {ordem.aparelho_descricao} · {ordem.cliente_nome}
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
            Problema relatado
          </h2>
          <p className="text-sm">{ordem.problema_relatado}</p>
        </div>

        <div className="rounded-xl border border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
            Aparelho
          </h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">IMEI</dt>
              <dd className="font-mono text-xs">{ordem.imei_mascarado || "não informado"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">Técnico</dt>
              <dd>{ordem.tecnico_nome ?? "não atribuído"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">Orçamento</dt>
              <dd>R$ {ordem.total_orcamento}</dd>
            </div>
          </dl>
        </div>
      </section>

      <CompartilharLink
        url={linkDoCliente}
        aparelho={ordem.aparelho_descricao}
        cliente={ordem.cliente_nome.split(" ")[0]}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Documentos</h2>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/ordens/${ordem.id}/documentos/comprovante`}
            target="_blank"
            rel="noopener"
            className={BOTAO_DE_DOCUMENTO}
          >
            Comprovante de entrada
          </a>
          {STATUS_COM_RECIBO.includes(ordem.status) && (
            <a
              href={`/ordens/${ordem.id}/documentos/recibo`}
              target="_blank"
              rel="noopener"
              className={BOTAO_DE_DOCUMENTO}
            >
              Recibo de entrega
            </a>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Mudar status</h2>
        <AcoesDeStatus id={ordem.id} transicoes={ordem.transicoes_possiveis} />
      </section>

      <FotosDaOrdem id={ordem.id} fotos={ordem.fotos} />

      {ordem.itens.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Orçamento</h2>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {ordem.itens.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm">{item.descricao}</span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  R$ {item.valor}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Histórico</h2>
        <ol className="space-y-3 border-l border-neutral-200 pl-5 dark:border-neutral-800">
          {ordem.eventos.map((evento) => (
            <li key={evento.id} className="relative">
              <span className="absolute top-1.5 -left-[23px] size-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <p className="text-sm">
                {evento.de_label} → <span className="font-medium">{evento.para_label}</span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatarMomento(evento.criado_em)}
                {evento.usuario && ` · ${evento.usuario}`}
                {evento.nota && ` · ${evento.nota}`}
              </p>
              {evento.aviso && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Cliente avisado por e-mail em {evento.aviso.destino}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
