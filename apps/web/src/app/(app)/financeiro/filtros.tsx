"use client";

import { useRef } from "react";
import { MagnifyingGlassIcon } from "@/componentes/icones";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { CATEGORIAS_DAS_CONTAS } from "@/lib/financeiro";

export type ValoresDasContas = { busca: string; categoria: string; situacao: string };

export function FiltrosDasContas({ valores }: { valores: ValoresDasContas }) {
  const formulario = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formulario}
      action="/financeiro"
      className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center"
    >
      {valores.situacao && <input type="hidden" name="situacao" value={valores.situacao} />}
      <div className="relative min-w-0 sm:flex-1 sm:basis-72">
        <MagnifyingGlassIcon
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-apagado"
        />
        <input
          name="busca"
          type="search"
          enterKeyHint="search"
          aria-label="Buscar contas"
          defaultValue={valores.busca}
          placeholder="Buscar pelo que é ou para quem"
          className={juntar(campo, "pl-10")}
        />
      </div>

      <select
        name="categoria"
        aria-label="Categoria"
        defaultValue={valores.categoria}
        onChange={() => formulario.current?.requestSubmit()}
        className={juntar(seletor, "w-full sm:w-auto")}
      >
        <option value="">Todas as categorias</option>
        {CATEGORIAS_DAS_CONTAS.map((categoria) => (
          <option key={categoria.valor} value={categoria.valor}>
            {categoria.rotulo}
          </option>
        ))}
      </select>

      <button type="submit" className={juntar(botao("secundario"), "max-sm:hidden")}>
        Buscar
      </button>
    </form>
  );
}
