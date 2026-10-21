import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  WarningIcon,
} from "@/componentes/icones";
import { Alerta } from "@/componentes/ui/Alerta";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { botao, juntar } from "@/componentes/ui/estilos";
import { ErroDaApi, chamarApi } from "@/lib/api";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { Pagina, Produto } from "@/lib/tipos";
import { Tour } from "../tour";
import { CabecalhoDoEstoque } from "./cabecalho";
import { FiltrosDoEstoque, type ValoresDoEstoque } from "./filtros";
import { QuantidadeDoProduto } from "./quantidade";

export const dynamic = "force-dynamic";

const FILTROS = ["busca", "tipo", "situacao"] as const;
const POR_PAGINA = 25;

const COLUNAS =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem_6.5rem] sm:items-center sm:gap-x-4";

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
  return texto ? `/estoque?${texto}` : "/estoque";
}

function paginaVizinha(atual: URLSearchParams, numero: number): string {
  const consulta = new URLSearchParams(atual);
  if (numero <= 1) consulta.delete("page");
  else consulta.set("page", String(numero));
  return endereco(consulta);
}

async function buscarProdutos(consulta: URLSearchParams): Promise<Pagina<Produto> | null> {
  try {
    return await chamarApi<Pagina<Produto>>(`/api/produtos/?${consulta}`);
  } catch (erro) {
    if (erro instanceof ErroDaApi && erro.status === 404) return null;
    throw erro;
  }
}

function detalheDoProduto(produto: Produto): string {
  return [produto.tipo_rotulo, produto.codigo].filter(Boolean).join(" · ");
}

export default async function Estoque({ searchParams }: { searchParams: Promise<Parametros> }) {
  const consulta = lerParametros(await searchParams);
  const [pagina, paraRepor] = await Promise.all([
    buscarProdutos(consulta),
    chamarApi<Pagina<Produto>>("/api/produtos/?situacao=repor"),
  ]);
  if (pagina === null) redirect(paginaVizinha(consulta, 1));

  const valores: ValoresDoEstoque = {
    busca: consulta.get("busca") ?? "",
    tipo: consulta.get("tipo") ?? "",
    situacao: consulta.get("situacao") ?? "",
  };
  const filtrando = FILTROS.some((chave) => consulta.get(chave));
  const numeroDaPagina = Number(consulta.get("page") ?? "1");
  const primeira = (numeroDaPagina - 1) * POR_PAGINA + 1;
  const ultima = Math.min(numeroDaPagina * POR_PAGINA, pagina.count);

  return (
    <>
      <CabecalhoDoEstoque
        ativa="produtos"
        descricao={
          pagina.count === 0 && !filtrando
            ? "Peças e acessórios da loja"
            : contagem(pagina.count, "produto", "produtos")
        }
      />

      <div className="space-y-4">
        {paraRepor.count > 0 && valores.situacao !== "repor" && (
          <Alerta
            tom="aviso"
            icone={WarningIcon}
            titulo={`${contagem(paraRepor.count, "produto precisa", "produtos precisam")} de reposição.`}
            acao={
              <Link href="/estoque?situacao=repor" className={botao("secundario", "sm")}>
                Ver o que repor
              </Link>
            }
          >
            Estão abaixo do mínimo ou faltam para ordens já aprovadas.
          </Alerta>
        )}

        <FiltrosDoEstoque valores={valores} />

        <div
          data-tour="lista-do-estoque"
          className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao"
        >
          {pagina.results.length === 0 ? (
            filtrando ? (
              <EstadoVazio
                icone={MagnifyingGlassIcon}
                titulo="Nenhum produto com esses filtros"
                descricao="Tente outra busca ou limpe os filtros para ver todos os produtos."
                acao={
                  <Link href="/estoque" className={botao("secundario", "sm")}>
                    Limpar filtros
                  </Link>
                }
              />
            ) : (
              <EstadoVazio
                icone={PackageIcon}
                titulo="Nenhum produto cadastrado"
                descricao="Cadastre as peças que você guarda para os consertos e os acessórios que vende no balcão."
                acao={
                  <Link href="/estoque/novo" className={botao("primario", "sm")}>
                    <PlusIcon size={16} />
                    Cadastrar produto
                  </Link>
                }
              />
            )
          ) : (
            <>
              <div
                className={`${COLUNAS} hidden border-b border-borda px-5 py-3 text-xs font-semibold text-texto-apagado`}
              >
                <span>Produto</span>
                <span>Em estoque</span>
                <span>Custo</span>
                <span>Preço</span>
              </div>

              <ul className="divide-y divide-borda">
                {pagina.results.map((produto) => (
                  <li key={produto.id}>
                    <Link
                      href={`/estoque/${produto.id}`}
                      className={`${COLUNAS} grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-4 py-3.5 transition-colors duration-150 hover:bg-realce sm:px-5`}
                    >
                      <span className="min-w-0">
                        <span
                          className={juntar(
                            "block truncate text-[15px] font-semibold sm:text-sm",
                            !produto.ativo && "text-texto-apagado",
                          )}
                        >
                          {produto.nome}
                        </span>
                        <span className="block truncate text-sm text-texto-apagado sm:text-[13px]">
                          {detalheDoProduto(produto)}
                          <span className="sm:hidden">
                            {" · "}
                            {emReais(produto.preco)}
                          </span>
                        </span>
                      </span>
                      <span className="text-right sm:text-left">
                        <QuantidadeDoProduto produto={produto} />
                      </span>
                      <span className="hidden text-[13px] text-texto-suave tabular-nums sm:block">
                        {emReais(produto.custo)}
                      </span>
                      <span className="hidden text-[13px] font-semibold text-dinheiro tabular-nums sm:block">
                        {emReais(produto.preco)}
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

      <Tour nome="estoque" />
    </>
  );
}
