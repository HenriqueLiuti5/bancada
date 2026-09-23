"use client";

import { useActionState } from "react";
import { verSenhaDoAparelho, type EstadoDaSenha } from "./acoes";

const INICIAL: EstadoDaSenha = {};

export function SenhaDoAparelho({ aparelho }: { aparelho: number }) {
  const [estado, acao, consultando] = useActionState(verSenhaDoAparelho, INICIAL);

  if (estado.revelada) {
    return (
      <div className="space-y-1">
        <p className="font-mono text-lg">
          {estado.senha || "Nenhuma senha cadastrada para este aparelho."}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Esta consulta ficou registrada na auditoria, com seu usuário e o horário.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="aparelho" value={aparelho} />
      <button
        type="submit"
        disabled={consultando}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:border-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:hover:border-neutral-300"
      >
        {consultando ? "Consultando..." : "Ver senha de desbloqueio"}
      </button>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Só técnicos podem ver, e cada consulta fica registrada.
      </p>
      {estado.erro && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
