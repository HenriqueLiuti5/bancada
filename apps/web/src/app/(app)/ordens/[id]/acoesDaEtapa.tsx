"use client";

import { useActionState, useState } from "react";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { IconeDeStatus } from "@/componentes/ui/Selo";
import { botao, caixaDeMarcar, campo, juntar } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";
import type { ItemOrcamento, Transicao } from "@/lib/tipos";
import { transicionar, type EstadoTransicao } from "./acoes";
import { NovoRecebimento } from "./pagamentoDaOrdem";
import { RegistroDaEntrega } from "./registroDaEntrega";

const INICIAL: EstadoTransicao = {};

const ACAO_DA_TRANSICAO: Record<string, string> = {
  em_diagnostico: "Começar o diagnóstico",
  orcamento_enviado: "Enviar o orçamento ao cliente",
  aprovado: "O cliente aprovou",
  reprovado: "O cliente recusou",
  em_reparo: "Começar o reparo",
  aguardando_peca: "Aguardar uma peça",
  pronto: "Reparo pronto",
  entregue: "Entregar ao cliente",
  devolvido_sem_reparo: "Registrar a devolução",
};

const PRINCIPAL_DE_CADA_ETAPA: Record<string, string> = {
  recebido: "em_diagnostico",
  em_diagnostico: "orcamento_enviado",
  orcamento_enviado: "aprovado",
  aprovado: "em_reparo",
  reprovado: "devolvido_sem_reparo",
  em_reparo: "pronto",
  aguardando_peca: "em_reparo",
  pronto: "entregue",
};

type Gaveta = "aprovacao" | "peca" | "entrega" | "recebimento";

function acaoDa(status: string, transicao: Transicao): string {
  if (status === "aguardando_peca" && transicao.valor === "em_reparo") {
    return "A peça chegou: voltar ao reparo";
  }
  return ACAO_DA_TRANSICAO[transicao.valor] ?? transicao.rotulo;
}

function gavetaDa(transicao: string, itens: ItemOrcamento[]): Gaveta | null {
  if (transicao === "aprovado" && itens.length > 1) return "aprovacao";
  if (transicao === "aguardando_peca") return "peca";
  if (transicao === "entregue") return "entrega";
  return null;
}

function Moldura({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 rounded-xl border border-borda p-4 sm:p-5">{children}</div>;
}

// O React limpa o formulário depois de cada envio. Depois de uma recusa, as caixas e a observação
// voltam com o que foi enviado, para o envio seguinte não aprovar o que o cliente recusou.
function EscolhaDosItensAprovados({
  itens,
  estado,
}: {
  itens: ItemOrcamento[];
  estado: EstadoTransicao;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold">O que o cliente aprovou?</legend>
      <input type="hidden" name="escolha_de_itens" value="sim" />

      {itens.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-center gap-2.5 text-sm sm:text-[13px]">
          <input
            type="checkbox"
            name="itens_aprovados"
            value={item.id}
            defaultChecked={estado.aprovados?.includes(item.id) ?? true}
            className={caixaDeMarcar}
          />
          <span className="min-w-0 flex-1 truncate">{item.descricao}</span>
          <span className="font-medium text-dinheiro tabular-nums">{emReais(item.valor)}</span>
        </label>
      ))}

      <p className="text-[13px] text-texto-apagado sm:text-xs">Desmarque o que o cliente recusou.</p>
      <input
        name="nota"
        aria-label="Observação"
        placeholder="Observação (opcional)"
        defaultValue={estado.nota}
        className={campo}
      />
    </fieldset>
  );
}

function PecaQueFalta({ estado }: { estado: EstadoTransicao }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold">Qual peça está faltando?</span>
      <input
        name="nota"
        autoFocus
        defaultValue={estado.nota}
        placeholder="Ex.: tela original, chega na sexta"
        className={campo}
      />
      <span className="block text-[13px] text-texto-apagado sm:text-xs">
        Opcional. Fica registrado no histórico da ordem.
      </span>
    </label>
  );
}

type Props = {
  id: number;
  status: string;
  transicoes: Transicao[];
  itens: ItemOrcamento[];
  totalAprovado: string;
  saldoAReceber: string;
  atalhos: React.ReactNode;
};

export function AcoesDaEtapa({
  id,
  status,
  transicoes,
  itens,
  totalAprovado,
  saldoAReceber,
  atalhos,
}: Props) {
  const [aberta, setAberta] = useState<Gaveta | null>(null);
  const [estado, acao, enviando] = useActionState(transicionar, INICIAL);
  const fechar = () => setAberta(null);

  if (aberta === "entrega") {
    return (
      <Moldura>
        <RegistroDaEntrega id={id} totalAprovado={totalAprovado} aoCancelar={fechar} />
      </Moldura>
    );
  }

  if (aberta === "recebimento") {
    return (
      <Moldura>
        <NovoRecebimento id={id} saldo={saldoAReceber} aoCancelar={fechar} />
      </Moldura>
    );
  }

  if (aberta) {
    const aprovacao = aberta === "aprovacao";
    return (
      <Moldura>
        <form action={acao} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          {aprovacao ? (
            <EscolhaDosItensAprovados itens={itens} estado={estado} />
          ) : (
            <PecaQueFalta estado={estado} />
          )}
          {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="status"
              value={aprovacao ? "aprovado" : "aguardando_peca"}
              disabled={enviando}
              className={juntar(botao("primario"), "max-sm:w-full")}
            >
              {aprovacao ? "Confirmar a aprovação" : "Pausar o reparo"}
            </button>
            <button type="button" onClick={fechar} className={juntar(botao("fantasma"), "max-sm:w-full")}>
              Cancelar
            </button>
          </div>
        </form>
      </Moldura>
    );
  }

  const principal = PRINCIPAL_DE_CADA_ETAPA[status];
  const ordenadas = [...transicoes].sort(
    (uma, outra) => Number(outra.valor === principal) - Number(uma.valor === principal),
  );
  const receber = status === "entregue" && Number(saldoAReceber) > 0;
  const faltaOrcamento = status === "em_diagnostico" && itens.length === 0;

  if (ordenadas.length === 0 && !receber && !atalhos) return null;

  return (
    <form action={acao} className="mt-5 space-y-3">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-wrap gap-2">
        {receber && (
          <button
            type="button"
            onClick={() => setAberta("recebimento")}
            className={juntar(botao("primario"), "max-sm:w-full")}
          >
            Registrar pagamento
          </button>
        )}

        {ordenadas.map((transicao) => {
          const eAPrincipal = transicao.valor === principal || ordenadas.length === 1;
          const gaveta = gavetaDa(transicao.valor, itens);
          const classes = juntar(botao(eAPrincipal ? "primario" : "secundario"), "max-sm:w-full");
          const rotulo = (
            <>
              {!eAPrincipal && <IconeDeStatus status={transicao.valor} tamanho={16} />}
              {acaoDa(status, transicao)}
            </>
          );

          if (gaveta) {
            return (
              <button
                key={transicao.valor}
                type="button"
                onClick={() => setAberta(gaveta)}
                className={classes}
              >
                {rotulo}
              </button>
            );
          }

          return (
            <button
              key={transicao.valor}
              type="submit"
              name="status"
              value={transicao.valor}
              disabled={enviando || (transicao.valor === "orcamento_enviado" && faltaOrcamento)}
              className={classes}
            >
              {rotulo}
            </button>
          );
        })}

        {atalhos}
      </div>

      {faltaOrcamento && (
        <p className="text-[13px] text-texto-apagado sm:text-xs">
          Adicione ao menos um item na aba Orçamento para poder enviar.
        </p>
      )}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
