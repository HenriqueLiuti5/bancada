"use client";

import { useActionState, useState } from "react";
import { ArrowUUpLeftIcon } from "@/componentes/icones";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao } from "@/componentes/ui/estilos";
import { desfazerVenda, type EstadoSimples } from "../../acoes";

const INICIAL: EstadoSimples = {};

// Desfazer pede uma segunda confirmação na própria tela, sem janela do navegador.
export function DesfazerVenda({ id }: { id: number }) {
  const [estado, acao, enviando] = useActionState(desfazerVenda, INICIAL);
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className={botao("perigo", "sm")}>
        <ArrowUUpLeftIcon size={15} />
        Desfazer venda
      </button>
    );
  }

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-borda p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">
        Os produtos voltam ao estoque e o valor sai do painel. A venda continua na lista, marcada como
        desfeita.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enviando} className={botao("perigo", "sm")}>
          {enviando ? "Desfazendo..." : "Sim, desfazer"}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => setConfirmando(false)}
          className={botao("fantasma", "sm")}
        >
          Cancelar
        </button>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
