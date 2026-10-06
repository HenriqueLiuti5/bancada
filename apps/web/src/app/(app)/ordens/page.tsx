import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CaretLeftIcon,
  CaretRightIcon,
  ClipboardTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";
import { Selo } from "@/componentes/ui/Selo";
import { botao, juntar } from "@/componentes/ui/estilos";
import { ErroDaApi, chamarApi } from "@/lib/api";
import { FUSO_HORARIO } from "@/lib/datas";
import type { Catalogo, OrdemResumo, Pagina, Usuario } from "@/lib/tipos";
import { PrimeirosPassos } from "../primeirosPassos";
import { Tour } from "../tour";
import { Filtros, type ValoresDosFiltros } from "./filtros";

export const dynamic = "force-dynamic";

const FILTROS = ["busca", "situacao", "status", "tecnico", "atrasadas", "ordem"] as const;
const POR_PAGINA = 25;

const COLUNAS = "sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_5.5rem_10.5rem] sm:items-center sm:gap-x-4";

type Parametros = Record<string, string | string[] | undefined>;

function lerParametros(recebidos: Parametros): URLSearchParams {
  const consulta = new URLSearchParams();
  for (const chave of [...FILTROS, "page"]) {
    const valor = recebidos[chave];
    if (typeof valor === "string" && valor !== "") consulta.set(chave, valor);
  }
  return consulta;
}

function endereco(consulta: URLSearchParams): string {
  const texto = consulta.toString();
  return texto ? `/ordens?${texto}` : "/ordens";
}

function comParametro(atual: URLSearchParams, mudancas: Record<string, string | null>): string {
  const consulta = new URLSearchParams(atual);
  for (const [chave, valor] of Object.entries(mudancas)) {
    if (valor === null) consulta.delete(chave);
    else consulta.set(chave, valor);
  }
  consulta.delete("page");
  return endereco(consulta);
}

function paginaVizinha(atual: URLSearchParams, numero: number): string {
  const consulta = new URLSearchParams(atual);
  if (numero <= 1) consulta.delete("page");
  else consulta.set("page", String(numero));
  return endereco(consulta);
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
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: FUSO_HORARIO,
  });
}

export default async function ListaDeOrdens({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const consulta = lerParametros(await searchParams);

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
  const primeira = (numeroDaPagina - 1) * POR_PAGINA + 1;
  const ultima = Math.min(numeroDaPagina * POR_PAGINA, pagina.count);
  const total = `${pagina.count} ${pagina.count === 1 ? "ordem" : "ordens"}`;

  return (
    <>
      <CabecalhoDaPagina
        titulo="Ordens de serviço"
        descricao={pagina.count === 0 ? "Nenhuma ordem encontrada" : total}
        acoes={
          <Link
            href="/ordens/nova"
            data-tour="nova-ordem"
            className={juntar(botao("primario"), "max-lg:hidden")}
          >
            <PlusIcon size={18} />
            Nova ordem
          </Link>
        }
      />

      <PrimeirosPassos />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmentos tour="situacoes">
            <Segmento
              href={comParametro(consulta, { situacao: null, atrasadas: null })}
              ativo={!valores.situacao && !valores.atrasadas}
            >
              Todas
            </Segmento>
            <Segmento
              href={comParametro(consulta, { situacao: "abertas", atrasadas: null })}
              ativo={valores.situacao === "abertas" && !valores.atrasadas}
            >
              Abertas
            </Segmento>
            <Segmento
              href={comParametro(consulta, { situacao: null, atrasadas: "1" })}
              ativo={valores.atrasadas === "1"}
            >
              Atrasadas
            </Segmento>
            <Segmento
              href={comParametro(consulta, { situacao: "encerradas", atrasadas: null })}
              ativo={valores.situacao === "encerradas"}
            >
              Encerradas
            </Segmento>
            <Segmento
              href={comParametro(consulta, { situacao: "a_receber", atrasadas: null })}
              ativo={valores.situacao === "a_receber"}
            >
              A receber
            </Segmento>
          </Segmentos>

          {filtrando && (
            <Link href="/ordens" className={botao("fantasma", "sm")}>
              Limpar filtros
            </Link>
          )}
        </div>

        <Filtros
          valores={valores}
          equipe={equipe}
          status={catalogo.status}
          ordenacoes={catalogo.ordenacoes}
        />

        <div
          data-tour="lista"
          className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao"
        >
          {pagina.results.length === 0 ? (
            filtrando ? (
              <EstadoVazio
                icone={MagnifyingGlassIcon}
                titulo="Nenhuma ordem com esses filtros"
                descricao="Tente outra busca ou limpe os filtros para ver todas as ordens."
                acao={
                  <Link href="/ordens" className={botao("secundario", "sm")}>
                    Limpar filtros
                  </Link>
                }
              />
            ) : (
              <EstadoVazio
                icone={ClipboardTextIcon}
                titulo="Nenhuma ordem por aqui ainda"
                descricao="Abra a primeira ordem de serviço quando um aparelho chegar ao balcão."
                acao={
                  <Link href="/ordens/nova" className={botao("primario", "sm")}>
                    <PlusIcon size={16} />
                    Nova ordem
                  </Link>
                }
              />
            )
          ) : (
            <>
              <div
                className={`${COLUNAS} hidden border-b border-borda px-5 py-3 text-xs font-semibold text-texto-apagado`}
              >
                <span>Nº</span>
                <span>Aparelho e cliente</span>
                <span>Técnico</span>
                <span>Aberta</span>
                <span>Status</span>
              </div>

              <ul className="divide-y divide-borda">
                {pagina.results.map((ordem) => (
                  <li key={ordem.id}>
                    <Link
                      href={`/ordens/${ordem.id}`}
                      className={`${COLUNAS} grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-4 py-3.5 transition-colors duration-150 hover:bg-realce sm:px-5`}
                    >
                      <span className="hidden text-[13px] font-semibold text-texto-apagado tabular-nums sm:block">
                        #{ordem.numero}
                      </span>
                      <span className="contents sm:block sm:min-w-0">
                        <span className="block truncate text-[15px] font-semibold sm:text-sm">
                          {ordem.aparelho_descricao}
                        </span>
                        <span className="col-span-2 block truncate text-sm text-texto-apagado sm:text-[13px]">
                          {ordem.cliente_nome} · {ordem.problema_relatado}
                        </span>
                        <span className="col-span-2 mt-1 block text-[13px] text-texto-apagado sm:hidden">
                          #{ordem.numero} · {formatarData(ordem.criado_em)}
                          {ordem.tecnico_nome && ` · ${ordem.tecnico_nome}`}
                        </span>
                      </span>
                      <span className="hidden truncate text-[13px] text-texto-suave sm:block">
                        {ordem.tecnico_nome ?? "—"}
                      </span>
                      <span className="hidden text-[13px] text-texto-suave tabular-nums sm:block">
                        {formatarData(ordem.criado_em)}
                      </span>
                      <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto sm:justify-self-start">
                        <Selo status={ordem.status} rotulo={ordem.status_label} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {(pagina.previous || pagina.next) && (
                <div className="flex items-center justify-between gap-4 border-t border-borda px-5 py-3.5">
                  <p className="text-[13px] text-texto-apagado tabular-nums">
                    {primeira}–{ultima} de {pagina.count}
                  </p>
                  <div className="flex gap-2">
                    {pagina.previous && (
                      <Link
                        href={paginaVizinha(consulta, numeroDaPagina - 1)}
                        className={botao("secundario", "sm")}
                      >
                        <CaretLeftIcon size={14} />
                        Anterior
                      </Link>
                    )}
                    {pagina.next && (
                      <Link
                        href={paginaVizinha(consulta, numeroDaPagina + 1)}
                        className={botao("secundario", "sm")}
                      >
                        Próxima
                        <CaretRightIcon size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Tour nome="ordens" />
    </>
  );
}
