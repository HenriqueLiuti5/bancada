import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon, CashRegisterIcon } from "@/componentes/icones";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { botao, juntar } from "@/componentes/ui/estilos";
import { ErroDaApi, chamarApi } from "@/lib/api";
import { diaEHora } from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { Pagina, VendaResumo } from "@/lib/tipos";
import { fusoDaAssistencia, usuarioAtual } from "@/lib/usuario";
import { CabecalhoDoEstoque } from "../cabecalho";

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

type Parametros = Record<string, string | string[] | undefined>;

function paginaVizinha(numero: number): string {
  return numero <= 1 ? "/estoque/vendas" : `/estoque/vendas?page=${numero}`;
}

async function buscarVendas(numero: number): Promise<Pagina<VendaResumo> | null> {
  try {
    return await chamarApi<Pagina<VendaResumo>>(`/api/vendas/?page=${numero}`);
  } catch (erro) {
    if (erro instanceof ErroDaApi && erro.status === 404) return null;
    throw erro;
  }
}

export default async function Vendas({ searchParams }: { searchParams: Promise<Parametros> }) {
  const recebidos = await searchParams;
  const pedida = typeof recebidos.page === "string" ? Number(recebidos.page) : 1;
  const numeroDaPagina = Number.isInteger(pedida) && pedida > 1 ? pedida : 1;

  const [pagina, usuario] = await Promise.all([buscarVendas(numeroDaPagina), usuarioAtual()]);
  if (pagina === null) redirect(paginaVizinha(1));

  const fuso = fusoDaAssistencia(usuario);
  const variasLojas = new Set(pagina.results.map((venda) => venda.loja)).size > 1;
  const primeira = (numeroDaPagina - 1) * POR_PAGINA + 1;
  const ultima = Math.min(numeroDaPagina * POR_PAGINA, pagina.count);

  return (
    <>
      <CabecalhoDoEstoque
        ativa="vendas"
        descricao={
          pagina.count === 0
            ? "Acessórios e peças vendidos no balcão"
            : contagem(pagina.count, "venda no balcão", "vendas no balcão")
        }
      />

      <div className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao">
        {pagina.results.length === 0 ? (
          <EstadoVazio
            icone={CashRegisterIcon}
            titulo="Nenhuma venda ainda"
            descricao="Capas, películas e carregadores vendidos no balcão saem do estoque e entram no painel."
            acao={
              <Link href="/estoque/vendas/nova" className={botao("primario", "sm")}>
                <CashRegisterIcon size={16} />
                Nova venda
              </Link>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-borda">
              {pagina.results.map((venda) => (
                <li key={venda.id}>
                  <Link
                    href={`/estoque/vendas/${venda.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-realce sm:px-5"
                  >
                    <span className="min-w-0">
                      <span
                        className={juntar(
                          "block truncate text-[15px] font-semibold sm:text-sm",
                          venda.desfeita && "text-texto-apagado line-through",
                        )}
                      >
                        {venda.resumo}
                      </span>
                      <span className="block truncate text-[13px] text-texto-apagado">
                        {[
                          `#${venda.numero}`,
                          diaEHora(venda.criado_em, fuso),
                          venda.vendida_por,
                          variasLojas ? venda.loja_nome : "",
                          venda.desfeita ? "desfeita" : venda.formas,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span
                      className={juntar(
                        "shrink-0 text-sm font-semibold text-dinheiro tabular-nums",
                        venda.desfeita && "text-texto-apagado line-through",
                      )}
                    >
                      {emReais(venda.valor_cobrado)}
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
                    <Link href={paginaVizinha(numeroDaPagina - 1)} className={botao("secundario", "sm")}>
                      <CaretLeftIcon size={14} />
                      Anterior
                    </Link>
                  )}
                  {pagina.next && (
                    <Link href={paginaVizinha(numeroDaPagina + 1)} className={botao("secundario", "sm")}>
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
    </>
  );
}
