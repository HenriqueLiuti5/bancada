import Link from "next/link";
import {
  CaretLeftIcon,
  CaretRightIcon,
  ClockCounterClockwiseIcon,
  PackageIcon,
  PencilSimpleIcon,
  TrayArrowDownIcon,
  WarningIcon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { botao, juntar, link } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { diaEHora } from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { Loja, MovimentoDeEstoque, Pagina, Produto } from "@/lib/tipos";
import { fusoDaAssistencia, usuarioAtual } from "@/lib/usuario";
import {
  AtivacaoDoProduto,
  CorrecaoDaContagem,
  DadosDoProduto,
  EntradaDeCompra,
  TransferenciaEntreLojas,
} from "./formularios";

export const dynamic = "force-dynamic";

type Parametros = Record<string, string | string[] | undefined>;

function OrigemDoMovimento({ movimento }: { movimento: MovimentoDeEstoque }) {
  if (movimento.ordem !== null) {
    return (
      <Link href={`/ordens/${movimento.ordem}`} className={link}>
        OS #{movimento.ordem_numero}
      </Link>
    );
  }
  if (movimento.venda !== null) {
    return (
      <Link href={`/estoque/vendas/${movimento.venda}`} className={link}>
        Venda #{movimento.venda_numero}
      </Link>
    );
  }
  const partes = [
    movimento.fornecedor,
    movimento.custo_unitario !== null && movimento.tipo === "entrada"
      ? `${emReais(movimento.custo_unitario)} cada`
      : "",
    movimento.observacao,
  ].filter(Boolean);
  return partes.length > 0 ? <>{partes.join(" · ")}</> : null;
}

function LinhaDoMovimento({
  movimento,
  variasLojas,
  fuso,
}: {
  movimento: MovimentoDeEstoque;
  variasLojas: boolean;
  fuso: string;
}) {
  const entrou = movimento.quantidade > 0;
  const quando = [
    diaEHora(movimento.criado_em, fuso),
    movimento.usuario,
    variasLojas ? movimento.loja_nome : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-start justify-between gap-4 px-5 py-3">
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">{movimento.tipo_rotulo}</span>
        <span className="block text-[13px] text-texto-suave">
          <OrigemDoMovimento movimento={movimento} />
        </span>
        <span className="block text-xs text-texto-apagado">{quando}</span>
      </span>
      <span
        className={juntar(
          "shrink-0 text-sm font-bold tabular-nums",
          entrou ? "text-sucesso" : "text-texto",
        )}
      >
        {entrou ? `+${movimento.quantidade}` : `−${-movimento.quantidade}`}
      </span>
    </li>
  );
}

function EmEstoque({ produto }: { produto: Produto }) {
  const falta = produto.quantidade < 0;

  return (
    <div className="space-y-3">
      <p
        className={juntar(
          "text-4xl leading-none font-bold tracking-tight tabular-nums",
          produto.para_repor && "text-perigo",
        )}
      >
        {falta ? `Faltam ${-produto.quantidade}` : produto.quantidade}
        {!falta && (
          <span className="ml-2 text-base font-medium text-texto-apagado">
            {produto.quantidade === 1 ? "unidade" : "unidades"}
          </span>
        )}
      </p>
      {produto.para_repor && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-perigo">
          <WarningIcon size={16} />
          {falta
            ? "Peças já prometidas a ordens que ainda não chegaram."
            : `Abaixo do mínimo de ${produto.minimo}.`}
        </p>
      )}
      {produto.por_loja.length > 0 && (
        <ul className="divide-y divide-borda rounded-xl border border-borda">
          {produto.por_loja.map((linha) => (
            <li key={linha.loja} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                {linha.nome}
                {!linha.ativa && <span className="text-texto-apagado"> (desativada)</span>}
              </span>
              <span className="font-semibold tabular-nums">{linha.quantidade}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DetalheDoProduto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Parametros>;
}) {
  const { id } = await params;
  const recebidos = await searchParams;
  const paginaPedida = typeof recebidos.movimentos === "string" ? Number(recebidos.movimentos) : 1;
  const numeroDaPagina = Number.isInteger(paginaPedida) && paginaPedida > 1 ? paginaPedida : 1;

  const [produto, movimentos, lojas, fornecedores, usuario] = await Promise.all([
    chamarApi<Produto>(`/api/produtos/${id}/`),
    chamarApi<Pagina<MovimentoDeEstoque>>(
      `/api/produtos/${id}/movimentos/?page=${numeroDaPagina}`,
    ),
    chamarApi<Loja[]>("/api/lojas/"),
    chamarApi<string[]>("/api/produtos/fornecedores/"),
    usuarioAtual(),
  ]);
  const ativas = lojas.filter((loja) => loja.ativa);
  const fuso = fusoDaAssistencia(usuario);
  const detalhe = [produto.tipo_rotulo, produto.codigo, `preço ${emReais(produto.preco)}`, `custo ${emReais(produto.custo)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/estoque", rotulo: "Estoque e vendas" }}
        titulo={produto.nome}
        junto={
          !produto.ativo && (
            <span className="rounded-full bg-realce px-2.5 py-1 text-xs font-semibold text-texto-suave">
              Desativado
            </span>
          )
        }
        descricao={detalhe}
        acoes={<AtivacaoDoProduto produto={produto} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Cartao titulo="Em estoque" icone={PackageIcon}>
            <div className="space-y-5">
              <EmEstoque produto={produto} />
              <div className="flex flex-col gap-3">
                <CorrecaoDaContagem produto={produto} lojas={ativas} />
                {ativas.length > 1 && <TransferenciaEntreLojas produto={produto} lojas={ativas} />}
              </div>
            </div>
          </Cartao>

          {produto.ativo && (
            <Cartao
              titulo="Registrar entrada"
              icone={TrayArrowDownIcon}
              descricao="Peças compradas que chegaram à loja."
            >
              <EntradaDeCompra produto={produto} lojas={ativas} fornecedores={fornecedores} />
            </Cartao>
          )}

          <Cartao
            titulo="Movimentações"
            icone={ClockCounterClockwiseIcon}
            descricao={contagem(movimentos.count, "registro", "registros")}
            semEspaco
          >
            {movimentos.results.length === 0 ? (
              <EstadoVazio
                icone={ClockCounterClockwiseIcon}
                titulo="Nada entrou nem saiu ainda"
                descricao="As entradas, as vendas e as peças usadas nas ordens aparecem aqui."
              />
            ) : (
              <>
                <ul className="divide-y divide-borda">
                  {movimentos.results.map((movimento) => (
                    <LinhaDoMovimento
                      key={movimento.id}
                      movimento={movimento}
                      variasLojas={produto.por_loja.length > 0}
                      fuso={fuso}
                    />
                  ))}
                </ul>
                {(movimentos.previous || movimentos.next) && (
                  <div className="flex justify-end gap-2 border-t border-borda px-5 py-3.5">
                    {movimentos.previous && (
                      <Link
                        href={`/estoque/${produto.id}?movimentos=${numeroDaPagina - 1}`}
                        className={botao("secundario", "sm")}
                      >
                        <CaretLeftIcon size={14} />
                        Mais recentes
                      </Link>
                    )}
                    {movimentos.next && (
                      <Link
                        href={`/estoque/${produto.id}?movimentos=${numeroDaPagina + 1}`}
                        className={botao("secundario", "sm")}
                      >
                        Mais antigos
                        <CaretRightIcon size={14} />
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </Cartao>
        </div>

        <aside>
          <Cartao titulo="Dados do produto" icone={PencilSimpleIcon}>
            <DadosDoProduto produto={produto} />
          </Cartao>
        </aside>
      </div>
    </>
  );
}
