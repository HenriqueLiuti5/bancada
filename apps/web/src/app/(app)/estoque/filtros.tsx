"use client";

import { useRef } from "react";
import { MagnifyingGlassIcon } from "@/componentes/icones";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";

export type ValoresDoEstoque = { busca: string; tipo: string; situacao: string };

const SELETOR_DO_FILTRO = juntar(seletor, "w-full sm:w-auto");

export function FiltrosDoEstoque({ valores }: { valores: ValoresDoEstoque }) {
  const formulario = useRef<HTMLFormElement>(null);
  const aplicar = () => formulario.current?.requestSubmit();

  return (
    <form
      ref={formulario}
      action="/estoque"
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
    >
      <div className="relative col-span-2 min-w-0 sm:flex-1 sm:basis-72">
        <MagnifyingGlassIcon
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-apagado"
        />
        <input
          name="busca"
          type="search"
          enterKeyHint="search"
          aria-label="Buscar produtos"
          defaultValue={valores.busca}
          placeholder="Buscar pelo nome ou pelo código"
          className={juntar(campo, "pl-10")}
        />
      </div>

      <select
        name="situacao"
        aria-label="Situação"
        defaultValue={valores.situacao}
        onChange={aplicar}
        className={SELETOR_DO_FILTRO}
      >
        <option value="">Ativos</option>
        <option value="repor">Para repor</option>
        <option value="desativados">Desativados</option>
      </select>

      <select
        name="tipo"
        aria-label="Tipo"
        defaultValue={valores.tipo}
        onChange={aplicar}
        className={SELETOR_DO_FILTRO}
      >
        <option value="">Todos os tipos</option>
        <option value="peca">Só peças</option>
        <option value="acessorio">Só acessórios</option>
      </select>

      <button type="submit" className={juntar(botao("secundario"), "max-sm:hidden")}>
        Buscar
      </button>
    </form>
  );
}
