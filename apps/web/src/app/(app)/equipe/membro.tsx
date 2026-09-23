"use client";

import { useActionState, useState } from "react";
import type { MembroDaEquipe } from "@/lib/tipos";
import { alterarUsuario, redefinirSenha, type EstadoDaEquipe } from "./acoes";

const INICIAL: EstadoDaEquipe = {};

const BOTAO =
  "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-300";

export function Membro({ membro, souEu }: { membro: MembroDaEquipe; souEu: boolean }) {
  const [alteracao, alterar, alterando] = useActionState(alterarUsuario, INICIAL);
  const [senha, trocarSenha, trocando] = useActionState(redefinirSenha, INICIAL);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={membro.is_active ? "text-sm font-medium" : "text-sm text-neutral-400"}>
            {membro.first_name || membro.username}
            {souEu && <span className="ml-2 text-xs text-neutral-500">você</span>}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {membro.username}
            {membro.email && ` · ${membro.email}`}
            {!membro.is_active && " · desativado"}
          </p>
        </div>

        {souEu ? (
          <span className="text-xs text-neutral-500">{membro.papel_rotulo}</span>
        ) : (
          <form action={alterar} className="flex items-center gap-2">
            <input type="hidden" name="id" value={membro.id} />
            <select
              name="papel"
              defaultValue={membro.papel}
              disabled={alterando}
              onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
            >
              <option value="dono">Dono</option>
              <option value="tecnico">Técnico</option>
              <option value="atendente">Atendente</option>
            </select>
          </form>
        )}

        {!souEu && (
          <form action={alterar}>
            <input type="hidden" name="id" value={membro.id} />
            <input type="hidden" name="ativo" value={membro.is_active ? "nao" : "sim"} />
            <button type="submit" disabled={alterando} className={BOTAO}>
              {membro.is_active ? "Desativar" : "Reativar"}
            </button>
          </form>
        )}

        <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className={BOTAO}>
          Redefinir senha
        </button>
      </div>

      {mostrarSenha && (
        <form action={trocarSenha} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={membro.id} />
          <input
            name="senha"
            type="password"
            placeholder="Nova senha"
            autoComplete="new-password"
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
          />
          <button type="submit" disabled={trocando} className={BOTAO}>
            {trocando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      {(alteracao.erro || senha.erro) && (
        <p className="text-xs text-red-600 dark:text-red-400">{alteracao.erro || senha.erro}</p>
      )}
      {senha.ok && <p className="text-xs text-emerald-600 dark:text-emerald-400">{senha.ok}</p>}
    </li>
  );
}
