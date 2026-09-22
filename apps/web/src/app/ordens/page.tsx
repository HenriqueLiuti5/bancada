import Link from "next/link";
import { Selo } from "@/componentes/Selo";
import { chamarApi } from "@/lib/api";
import type { OrdemResumo, Pagina } from "@/lib/tipos";

export const dynamic = "force-dynamic";

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default async function ListaDeOrdens() {
  const pagina = await chamarApi<Pagina<OrdemResumo>>("/api/ordens/");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {pagina.count} {pagina.count === 1 ? "ordem" : "ordens"}
          </p>
        </div>
        <Link
          href="/ordens/nova"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Nova OS
        </Link>
      </div>

      {pagina.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-5 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Nenhuma ordem por aqui ainda.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {pagina.results.map((ordem) => (
            <li key={ordem.id}>
              <Link
                href={`/ordens/${ordem.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className="w-12 shrink-0 font-mono text-sm text-neutral-500 dark:text-neutral-400">
                  #{ordem.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ordem.aparelho_descricao}</p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {ordem.cliente_nome} · {ordem.problema_relatado}
                  </p>
                </div>
                <span className="hidden text-xs text-neutral-400 sm:inline">
                  {formatarData(ordem.criado_em)}
                </span>
                <Selo status={ordem.status} rotulo={ordem.status_label} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
