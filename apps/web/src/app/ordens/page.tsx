import Link from "next/link";
import { redirect } from "next/navigation";
import { Selo } from "@/componentes/Selo";
import { ErroDaApi, chamarApi } from "@/lib/api";
import type { Catalogo, OrdemResumo, Pagina, Usuario } from "@/lib/tipos";
import { Filtros, type ValoresDosFiltros } from "./filtros";

export const dynamic = "force-dynamic";

const FILTROS = ["busca", "situacao", "status", "tecnico", "atrasadas", "ordem"] as const;

type Parametros = Record<string, string | string[] | undefined>;

function lerParametros(recebidos: Parametros): URLSearchParams {
  const consulta = new URLSearchParams();

  for (const chave of [...FILTROS, "page"]) {
    const valor = recebidos[chave];
    if (typeof valor === "string" && valor !== "") consulta.set(chave, valor);
  }

  return consulta;
}

function comParametro(atual: URLSearchParams, mudancas: Record<string, string | null>): string {
  const consulta = new URLSearchParams(atual);

  for (const [chave, valor] of Object.entries(mudancas)) {
    if (valor === null) consulta.delete(chave);
    else consulta.set(chave, valor);
  }
  consulta.delete("page");

  const texto = consulta.toString();
  return texto ? `/ordens?${texto}` : "/ordens";
}

function paginaVizinha(atual: URLSearchParams, numero: number): string {
  const consulta = new URLSearchParams(atual);
  if (numero <= 1) consulta.delete("page");
  else consulta.set("page", String(numero));
  const texto = consulta.toString();
  return texto ? `/ordens?${texto}` : "/ordens";
}

async function buscarOrdens(consulta: URLSearchParams): Promise<Pagina<OrdemResumo> | null> {
  try {
    return await chamarApi<Pagina<OrdemResumo>>(`/api/ordens/?${consulta}`);
  } catch (erro) {
    if (erro instanceof ErroDaApi && erro.status === 404) return null;
    throw erro;
  }
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Atalho({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  const estilo = ativo
    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
    : "border border-neutral-300 text-neutral-600 hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-300";

  return (
    <Link href={href} className={`rounded-full px-3 py-1 text-xs font-medium ${estilo}`}>
      {children}
    </Link>
  );
}

export default async function ListaDeOrdens({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const recebidos = await searchParams;
  const consulta = lerParametros(recebidos);

  const [pagina, equipe, catalogo] = await Promise.all([
    buscarOrdens(consulta),
    chamarApi<Usuario[]>("/api/equipe/"),
    chamarApi<Catalogo>("/api/ordens/catalogo/"),
  ]);

  if (pagina === null) redirect(paginaVizinha(consulta, 1));

  const valores: ValoresDosFiltros = {
    busca: consulta.get("busca") ?? "",
    status: consulta.get("status") ?? "",
    tecnico: consulta.get("tecnico") ?? "",
    ordem: consulta.get("ordem") ?? "recentes",
    situacao: consulta.get("situacao") ?? "",
    atrasadas: consulta.get("atrasadas") ?? "",
  };

  const filtrando = FILTROS.some((chave) => consulta.get(chave));
  const numeroDaPagina = Number(consulta.get("page") ?? "1");
  const porPagina = 25;
  const primeira = (numeroDaPagina - 1) * porPagina + 1;
  const ultima = Math.min(numeroDaPagina * porPagina, pagina.count);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ordens de serviço</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {pagina.count === 0
              ? "nenhuma ordem"
              : `${pagina.count} ${pagina.count === 1 ? "ordem" : "ordens"}`}
            {pagina.count > porPagina && ` · mostrando ${primeira} a ${ultima}`}
          </p>
        </div>
        <Link
          href="/ordens/nova"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Nova OS
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Atalho
            href={comParametro(consulta, { situacao: null, atrasadas: null })}
            ativo={!valores.situacao && !valores.atrasadas}
          >
            Todas
          </Atalho>
          <Atalho
            href={comParametro(consulta, { situacao: "abertas", atrasadas: null })}
            ativo={valores.situacao === "abertas" && !valores.atrasadas}
          >
            Abertas
          </Atalho>
          <Atalho
            href={comParametro(consulta, { situacao: null, atrasadas: "1" })}
            ativo={valores.atrasadas === "1"}
          >
            Atrasadas
          </Atalho>
          <Atalho
            href={comParametro(consulta, { situacao: "encerradas", atrasadas: null })}
            ativo={valores.situacao === "encerradas"}
          >
            Encerradas
          </Atalho>

          {filtrando && (
            <Link
              href="/ordens"
              className="text-xs text-neutral-500 underline underline-offset-4 dark:text-neutral-400"
            >
              limpar filtros
            </Link>
          )}
        </div>

        <Filtros
          valores={valores}
          equipe={equipe}
          status={catalogo.status}
          ordenacoes={catalogo.ordenacoes}
        />
      </div>

      {pagina.results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-5 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          {filtrando
            ? "Nenhuma ordem com esses filtros."
            : "Nenhuma ordem por aqui ainda."}
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

      {(pagina.previous || pagina.next) && (
        <div className="flex items-center justify-between gap-4 text-sm">
          {pagina.previous ? (
            <Link
              href={paginaVizinha(consulta, numeroDaPagina - 1)}
              className="rounded-lg border border-neutral-300 px-3 py-2 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-300"
            >
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          {pagina.next && (
            <Link
              href={paginaVizinha(consulta, numeroDaPagina + 1)}
              className="rounded-lg border border-neutral-300 px-3 py-2 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-300"
            >
              Próximas →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
