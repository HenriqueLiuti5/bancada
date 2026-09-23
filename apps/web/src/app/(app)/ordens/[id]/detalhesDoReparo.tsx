"use client";

import { useActionState } from "react";
import type { Ordem, Usuario } from "@/lib/tipos";
import { salvarDetalhes, type EstadoDosDetalhes } from "./acoes";

const INICIAL: EstadoDosDetalhes = {};

const CAMPO =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

export function DetalhesDoReparo({ ordem, equipe }: { ordem: Ordem; equipe: Usuario[] }) {
  const [estado, acao, salvando] = useActionState(salvarDetalhes, INICIAL);

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={ordem.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Técnico responsável</span>
          <select name="tecnico" defaultValue={ordem.tecnico ?? ""} className={CAMPO}>
            <option value="">Ninguém ainda</option>
            {equipe.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.first_name || pessoa.username}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Prazo prometido</span>
          <input
            type="date"
            name="prometida_para"
            defaultValue={ordem.prometida_para ?? ""}
            className={CAMPO}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Diagnóstico (uso interno, o cliente não vê)
        </span>
        <textarea name="diagnostico" rows={2} defaultValue={ordem.diagnostico} className={CAMPO} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Laudo (sai impresso no recibo de entrega)
        </span>
        <textarea name="laudo" rows={2} defaultValue={ordem.laudo} className={CAMPO} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {salvando ? "Salvando..." : "Salvar detalhes"}
        </button>
        {estado.salvo && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Salvo.</p>
        )}
        {estado.erro && <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>}
      </div>
    </form>
  );
}
