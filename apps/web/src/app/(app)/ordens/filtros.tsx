"use client";

import { useRef } from "react";
import type { Opcao, Usuario } from "@/lib/tipos";

const CAMPO =
  "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

export type ValoresDosFiltros = {
  busca: string;
  status: string;
  tecnico: string;
  ordem: string;
  situacao: string;
  atrasadas: string;
};

export function Filtros({
  valores,
  equipe,
  status,
  ordenacoes,
}: {
  valores: ValoresDosFiltros;
  equipe: Usuario[];
  status: Opcao[];
  ordenacoes: Opcao[];
}) {
  const formulario = useRef<HTMLFormElement>(null);

  const aplicar = () => formulario.current?.requestSubmit();

  return (
    <form ref={formulario} action="/ordens" className="flex flex-wrap items-center gap-2">
      {valores.situacao && <input type="hidden" name="situacao" value={valores.situacao} />}
      {valores.atrasadas && <input type="hidden" name="atrasadas" value={valores.atrasadas} />}

      <input
        name="busca"
        defaultValue={valores.busca}
        placeholder="Cliente, aparelho, IMEI, telefone ou nº da OS"
        className={`${CAMPO} min-w-0 flex-1 sm:min-w-72`}
      />

      <select name="status" defaultValue={valores.status} className={CAMPO} onChange={aplicar}>
        <option value="">Todos os status</option>
        {status.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>

      <select name="tecnico" defaultValue={valores.tecnico} className={CAMPO} onChange={aplicar}>
        <option value="">Qualquer técnico</option>
        <option value="sem">Sem técnico</option>
        {equipe.map((pessoa) => (
          <option key={pessoa.id} value={pessoa.id}>
            {pessoa.first_name || pessoa.username}
          </option>
        ))}
      </select>

      <select name="ordem" defaultValue={valores.ordem} className={CAMPO} onChange={aplicar}>
        {ordenacoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Buscar
      </button>
    </form>
  );
}
