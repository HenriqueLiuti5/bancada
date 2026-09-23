"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarUsuario, type EstadoDaEquipe } from "./acoes";

const INICIAL: EstadoDaEquipe = {};

const CAMPO =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

export function NovoMembro() {
  const [estado, acao, enviando] = useActionState(criarUsuario, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={acao} className="grid gap-3 sm:grid-cols-2">
      <input name="first_name" placeholder="Nome" className={CAMPO} />
      <input name="username" placeholder="Usuário para entrar" required className={CAMPO} />
      <input name="email" type="email" placeholder="E-mail (opcional)" className={CAMPO} />
      <select name="papel" defaultValue="tecnico" className={CAMPO}>
        <option value="tecnico">Técnico</option>
        <option value="atendente">Atendente</option>
        <option value="dono">Dono</option>
      </select>
      <input
        name="senha"
        type="password"
        placeholder="Senha inicial"
        required
        autoComplete="new-password"
        className={`${CAMPO} sm:col-span-2`}
      />

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {enviando ? "Criando..." : "Adicionar à equipe"}
        </button>
        {estado.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>}
        {estado.erro && <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>}
      </div>
    </form>
  );
}
