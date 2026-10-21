import Link from "next/link";
import { ArrowUUpLeftIcon, CashRegisterIcon, WalletIcon } from "@/componentes/icones";
import { Alerta } from "@/componentes/ui/Alerta";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { link } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { dataEHora } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type { Loja, Venda } from "@/lib/tipos";
import { fusoDaAssistencia, gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { DesfazerVenda } from "./desfazer";

export const dynamic = "force-dynamic";

type Parametros = Record<string, string | string[] | undefined>;

function Linha({
  rotulo,
  valor,
  forte = false,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${forte ? "font-bold" : ""}`}>
      <dt className={forte ? "" : "text-texto-apagado"}>{rotulo}</dt>
      <dd className="text-dinheiro tabular-nums">{valor}</dd>
    </div>
  );
}

export default async function DetalheDaVenda({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Parametros>;
}) {
  const { id } = await params;
  const recebidos = await searchParams;
  const [venda, lojas, usuario] = await Promise.all([
    chamarApi<Venda>(`/api/vendas/${id}/`),
    chamarApi<Loja[]>("/api/lojas/"),
    usuarioAtual(),
  ]);
  const fuso = fusoDaAssistencia(usuario);
  const registrada = recebidos.registrada === "1" && !venda.desfeita;
  const quem = [
    dataEHora(venda.criado_em, fuso),
    venda.vendida_por,
    lojas.length > 1 ? venda.loja_nome : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/estoque/vendas", rotulo: "Vendas no balcão" }}
        titulo={`Venda #${venda.numero}`}
        junto={
          venda.desfeita && (
            <span className="rounded-full bg-realce px-2.5 py-1 text-xs font-semibold text-texto-suave">
              Desfeita
            </span>
          )
        }
        descricao={quem}
      />

      <div className="max-w-3xl space-y-6">
        {registrada && (
          <Mensagem tipo="sucesso">
            Venda registrada. Os produtos já saíram do estoque.{" "}
            <Link href="/estoque/vendas/nova" className={link}>
              Fazer outra venda
            </Link>
          </Mensagem>
        )}

        {venda.desfeita && (
          <Alerta
            tom="aviso"
            icone={ArrowUUpLeftIcon}
            titulo={`Desfeita por ${venda.desfeita_por ?? "alguém da equipe"}${
              venda.desfeita_em ? ` em ${dataEHora(venda.desfeita_em, fuso)}` : ""
            }.`}
          >
            Os produtos voltaram ao estoque e o valor não conta no painel.
          </Alerta>
        )}

        <Cartao titulo="Produtos" icone={CashRegisterIcon} semEspaco>
          <ul className="divide-y divide-borda">
            {venda.itens.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="min-w-0">
                  <Link href={`/estoque/${item.produto}`} className="block truncate text-sm font-medium hover:underline">
                    {item.descricao}
                  </Link>
                  <span className="text-xs text-texto-apagado tabular-nums">
                    {item.quantidade} × {emReais(item.preco)} · custo {emReais(item.custo)} cada
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-dinheiro tabular-nums">
                  {emReais(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-borda bg-realce px-5 py-3.5 text-sm">
            {Number(venda.desconto) > 0 && (
              <>
                <Linha rotulo="Total dos produtos" valor={emReais(venda.total)} />
                <Linha rotulo="Desconto" valor={`−${emReais(venda.desconto)}`} />
              </>
            )}
            <Linha rotulo="Valor cobrado" valor={emReais(venda.valor_cobrado)} forte />
            <Linha rotulo="Custo dos produtos" valor={emReais(venda.custo)} />
            <Linha rotulo="Lucro" valor={emReais(venda.lucro)} forte />
          </dl>
        </Cartao>

        <Cartao titulo="Pagamento" icone={WalletIcon} semEspaco>
          {venda.pagamentos.length === 0 ? (
            <p className="px-5 py-4 text-sm text-texto-suave">Sem custo para o cliente.</p>
          ) : (
            <ul className="divide-y divide-borda">
              {venda.pagamentos.map((pagamento) => (
                <li key={pagamento.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-sm font-medium">{pagamento.forma_rotulo}</span>
                  <span className="text-sm font-semibold text-dinheiro tabular-nums">
                    {emReais(pagamento.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {venda.observacao && (
            <p className="border-t border-borda px-5 py-3 text-[13px] text-texto-suave">
              {venda.observacao}
            </p>
          )}
        </Cartao>

        {!venda.desfeita && gerenciaEquipe(usuario) && <DesfazerVenda id={venda.id} />}
      </div>
    </>
  );
}
