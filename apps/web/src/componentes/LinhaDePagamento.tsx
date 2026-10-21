"use client";

import { XIcon } from "@/componentes/icones";
import { botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { useOpcaoPadrao } from "@/componentes/useOpcaoPadrao";
import { FORMAS_DE_PAGAMENTO } from "@/lib/pagamentos";

export type LinhaPaga = { chave: number; forma: string; valor: string };

export function LinhaDePagamento({
  linha,
  aoMudar,
  aoRemover,
}: {
  linha: LinhaPaga;
  aoMudar: (mudanca: Partial<LinhaPaga>) => void;
  aoRemover: () => void;
}) {
  const forma = useOpcaoPadrao(linha.forma);

  return (
    <div className="flex items-center gap-2">
      <select
        ref={forma}
        name="forma"
        aria-label="Forma de pagamento"
        value={linha.forma}
        onChange={(evento) => aoMudar({ forma: evento.target.value })}
        className={juntar(seletor, "w-28 shrink-0")}
      >
        {FORMAS_DE_PAGAMENTO.map((forma) => (
          <option key={forma.valor} value={forma.valor}>
            {forma.rotulo}
          </option>
        ))}
      </select>
      <input
        name="valor_pago"
        aria-label="Valor pago nessa forma"
        inputMode="decimal"
        autoComplete="off"
        value={linha.valor}
        onChange={(evento) => aoMudar({ valor: evento.target.value })}
        className={juntar(campo, "min-w-0 flex-1 tabular-nums")}
      />
      <button
        type="button"
        onClick={aoRemover}
        title="Tirar esta forma"
        className={botaoDeIcone}
      >
        <XIcon size={16} />
        <span className="sr-only">Tirar esta forma de pagamento</span>
      </button>
    </div>
  );
}
