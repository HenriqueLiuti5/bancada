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
        Desmarque o que o cliente recusou antes de clicar em Aprovado.
      </p>
    </fieldset>
  );
}

export function AcoesDeStatus({
  id,
  transicoes,
  itens,
  totalAprovado,
}: {
  id: number;
  transicoes: Transicao[];
  itens: ItemOrcamento[];
  totalAprovado: string;
}) {
  const [estado, acao, enviando] = useActionState(transicionar, INICIAL);
  const aguardaAprovacao = transicoes.some((transicao) => transicao.valor === "aprovado");
  const podeEntregar = transicoes.some((transicao) => transicao.valor === "entregue");
  const proximaUnica = transicoes.length === 1;

  if (podeEntregar) return <RegistroDaEntrega id={id} totalAprovado={totalAprovado} />;

  if (transicoes.length === 0) {
    return (
      <p className="text-sm text-texto-suave sm:text-[13px]">
        Esta ordem está encerrada. Nenhuma mudança de status é possível.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      {aguardaAprovacao && itens.length > 1 && <EscolhaDosItensAprovados itens={itens} />}

      <input
        name="nota"
        aria-label="Observação"
        placeholder="Observação (opcional)"
        className={campo}
      />

      <div className="space-y-2">
        {transicoes.map((transicao) => (
          <button
            key={transicao.valor}
            type="submit"
            name="status"
            value={transicao.valor}
            disabled={enviando}
            className={juntar(
              botao(proximaUnica ? "primario" : "secundario"),
              "w-full",
              !proximaUnica && "justify-start",
            )}
          >
            {!proximaUnica && <IconeDeStatus status={transicao.valor} tamanho={16} />}
            {transicao.rotulo}
          </button>
        ))}
      </div>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
