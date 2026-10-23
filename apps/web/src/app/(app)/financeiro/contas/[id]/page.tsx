import { redirect } from "next/navigation";
import {
  CheckCircleIcon,
  MoneyIcon,
  PencilSimpleIcon,
  ReceiptIcon,
  RepeatIcon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import { dataCurta, dataEHora, hojeEmIso } from "@/lib/datas";
import { situacaoDoVencimento } from "@/lib/financeiro";
import { emReais } from "@/lib/moeda";
import type { ContaAPagar, Loja } from "@/lib/tipos";
import { fusoDaAssistencia, gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { VencimentoDaConta } from "../../vencimento";
import {
  DadosDaConta,
  DesfazerPagamento,
  PagamentoDaConta,
  PararDeRepetir,
  RemoverConta,
} from "./formularios";

export const dynamic = "force-dynamic";

function SeloDaConta({ conta, hoje }: { conta: ContaAPagar; hoje: string }) {
  if (conta.paga) {
    return (
      <span className="rounded-full bg-realce px-2.5 py-1 text-xs font-semibold text-texto-suave">
        Paga
      </span>
    );
  }
  if (situacaoDoVencimento(conta, hoje).tom !== "vencida") return null;
  return (
    <span className="rounded-full bg-perigo-suave px-2.5 py-1 text-xs font-semibold text-perigo">
      Vencida
    </span>
  );
}

function origemDaConta(conta: ContaAPagar, fuso: string): string {
  const quando = dataEHora(conta.criado_em, fuso);
  if (conta.lancada_por) return `Lançada por ${conta.lancada_por} em ${quando}.`;
  return `Criada pela repetição de todo mês em ${quando}.`;
}

export default async function DetalheDaConta({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioAtual();
  if (!gerenciaEquipe(usuario)) redirect("/financeiro");

  const { id } = await params;
  const [conta, lojas, fornecedores] = await Promise.all([
    chamarApi<ContaAPagar>(`/api/contas-a-pagar/${id}/`),
    chamarApi<Loja[]>("/api/lojas/"),
    chamarApi<string[]>("/api/contas-a-pagar/fornecedores/"),
  ]);
  const fuso = fusoDaAssistencia(usuario);
  const hoje = hojeEmIso(fuso);
  const variasLojas = lojas.length > 1;
  const detalhe = [
    conta.categoria_rotulo,
    conta.fornecedor,
    variasLojas ? (conta.loja_nome ?? "Toda a assistência") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/financeiro", rotulo: "Contas a pagar" }}
        titulo={conta.descricao}
        junto={<SeloDaConta conta={conta} hoje={hoje} />}
        descricao={detalhe}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Cartao titulo="Conta" icone={ReceiptIcon}>
            <div className="space-y-3">
              <p className="text-4xl leading-none font-bold tracking-tight text-dinheiro tabular-nums">
                {emReais(conta.valor)}
              </p>
              <div className="space-y-1 text-sm text-texto-suave">
                <p>
                  Vencimento em {dataCurta(conta.vencimento)}
                  {!conta.paga && (
                    <>
                      {" · "}
                      <VencimentoDaConta conta={conta} hoje={hoje} frase />
                    </>
                  )}
                </p>
                {conta.repete && conta.dia_da_repeticao !== null && (
                  <p>Repete todo mês, no dia {conta.dia_da_repeticao}.</p>
                )}
                {conta.observacao && <p>{conta.observacao}</p>}
                <p className="text-[13px] text-texto-apagado">{origemDaConta(conta, fuso)}</p>
              </div>
            </div>
          </Cartao>

          {conta.paga && conta.paga_em ? (
            <Cartao titulo="Pagamento" icone={CheckCircleIcon}>
              <div className="space-y-4">
                <p className="text-sm">
                  Paga em {dataCurta(conta.paga_em)} com {conta.forma_rotulo}
                  {conta.paga_por ? `, registrada por ${conta.paga_por}` : ""}.
                </p>
                <DesfazerPagamento id={conta.id} />
              </div>
            </Cartao>
          ) : (
            <Cartao
              titulo="Registrar pagamento"
              icone={MoneyIcon}
              descricao="Quando a conta for paga, marque aqui com o valor, a data e a forma."
            >
              <PagamentoDaConta conta={conta} hoje={hoje} />
            </Cartao>
          )}

          {conta.repete && (
            <Cartao
              titulo="Repetição"
              icone={RepeatIcon}
              descricao="A conta de cada mês aparece sozinha, um mês antes de vencer."
            >
              <PararDeRepetir id={conta.id} />
            </Cartao>
          )}
        </div>

        <aside className="space-y-4">
          <Cartao titulo="Dados da conta" icone={PencilSimpleIcon}>
            <DadosDaConta
              conta={conta}
              lojas={lojas.filter((loja) => loja.ativa || loja.id === conta.loja)}
              fornecedores={fornecedores}
              hoje={hoje}
            />
          </Cartao>
          <RemoverConta id={conta.id} repete={conta.repete} />
        </aside>
      </div>
    </>
  );
}
