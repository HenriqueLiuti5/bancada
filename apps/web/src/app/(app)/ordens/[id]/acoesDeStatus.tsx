"use client";

import { useActionState } from "react";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { IconeDeStatus } from "@/componentes/ui/Selo";
import { botao, caixaDeMarcar, campo, juntar } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";
import type { ItemOrcamento, Transicao } from "@/lib/tipos";
import { transicionar, type EstadoTransicao } from "./acoes";
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
};

function acaoDa(status: string, transicao: Transicao): string {
  if (status === "aguardando_peca" && transicao.valor === "em_reparo") {
    return "A peça chegou: voltar ao reparo";
  }
  return ACAO_DA_TRANSICAO[transicao.valor] ?? transicao.rotulo;
}

function EscolhaDosItensAprovados({ itens }: { itens: ItemOrcamento[] }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-borda p-4">
      <legend className="px-1 text-sm font-semibold sm:text-[13px]">Itens aprovados pelo cliente</legend>
      <input type="hidden" name="escolha_de_itens" value="sim" />

      {itens.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-center gap-2.5 text-sm sm:text-[13px]">
          <input
            type="checkbox"
            name="itens_aprovados"
            value={item.id}
            defaultChecked
            className={caixaDeMarcar}
          />
          <span className="min-w-0 flex-1 truncate">{item.descricao}</span>
          <span className="font-medium text-dinheiro tabular-nums">{emReais(item.valor)}</span>
        </label>
      ))}

      <p className="text-[13px] text-texto-apagado sm:text-xs">
        Se o cliente recusou algum item, desmarque antes de clicar em O cliente aprovou.
      </p>
    </fieldset>
  );
}

export function AcoesDeStatus({
  id,
  status,
  transicoes,
  itens,
  totalAprovado,
}: {
  id: number;
  status: string;
  transicoes: Transicao[];
  itens: ItemOrcamento[];
  totalAprovado: string;
}) {
  const [estado, acao, enviando] = useActionState(transicionar, INICIAL);
  const aguardaAprovacao = transicoes.some((transicao) => transicao.valor === "aprovado");
  const podeEntregar = transicoes.some((transicao) => transicao.valor === "entregue");
  const principal = PRINCIPAL_DE_CADA_ETAPA[status];
  const ordenadas = [...transicoes].sort(
    (uma, outra) => Number(outra.valor === principal) - Number(uma.valor === principal),
  );
  const faltaOrcamento = status === "em_diagnostico" && itens.length === 0;

  if (podeEntregar) return <RegistroDaEntrega id={id} totalAprovado={totalAprovado} />;

  if (transicoes.length === 0) return null;

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      {aguardaAprovacao && itens.length > 1 && <EscolhaDosItensAprovados itens={itens} />}

      <div className="flex flex-wrap gap-2">
        {ordenadas.map((transicao) => {
          const eAPrincipal = transicao.valor === principal || ordenadas.length === 1;
          return (
            <button
              key={transicao.valor}
              type="submit"
              name="status"
              value={transicao.valor}
              disabled={enviando || (transicao.valor === "orcamento_enviado" && faltaOrcamento)}
              className={juntar(botao(eAPrincipal ? "primario" : "secundario"), "max-sm:w-full")}
            >
              {!eAPrincipal && <IconeDeStatus status={transicao.valor} tamanho={16} />}
              {acaoDa(status, transicao)}
            </button>
          );
        })}
      </div>

      {faltaOrcamento && (
        <p className="text-[13px] text-texto-apagado sm:text-xs">
          Adicione ao menos um item no orçamento para poder enviar.
        </p>
      )}

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-[13px] font-semibold text-texto-suave hover:text-texto [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Escrever uma observação</span>
          <span className="hidden group-open:inline">Observação para o histórico</span>
        </summary>
        <input
          name="nota"
          aria-label="Observação"
          placeholder="Opcional. Fica registrada no histórico da ordem."
          className={juntar(campo, "mt-2")}
        />
      </details>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
