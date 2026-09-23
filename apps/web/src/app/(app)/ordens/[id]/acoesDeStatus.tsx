"use client";

import { useActionState } from "react";
import { transicionar, type EstadoTransicao } from "./acoes";
import type { Transicao } from "@/lib/tipos";

const INICIAL: EstadoTransicao = {};

export function AcoesDeStatus({
  id,
  transicoes,
}: {
  id: number;
  transicoes: Transicao[];
}) {
  const [estado, acao, enviando] = useActionState(transicionar, INICIAL);

  if (transicoes.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Esta ordem está encerrada.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <input
        name="nota"
        placeholder="Observação (opcional)"
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300"
      />

      <div className="flex flex-wrap gap-2">
        {transicoes.map((transicao) => (
          <button
            key={transicao.valor}
            type="submit"
            name="status"
            value={transicao.valor}
            disabled={enviando}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {transicao.rotulo}
          </button>
        ))}
      </div>

      {estado.erro && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
