"use client";

import { useRef, useState } from "react";
import { MagnifyingGlassIcon, SlidersHorizontalIcon } from "@/componentes/icones";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import type { Opcao, Usuario } from "@/lib/tipos";

export type ValoresDosFiltros = {
  busca: string;
  status: string;
  tecnico: string;
  ordem: string;
  situacao: string;
  atrasadas: string;
};

const ORDEM_PADRAO = "recentes";

const SELETOR_DO_FILTRO = juntar(seletor, "w-full sm:w-auto");

function filtrosEscolhidos(valores: ValoresDosFiltros): number {
  return [valores.status, valores.tecnico, valores.ordem !== ORDEM_PADRAO].filter(Boolean).length;
}

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
  const escolhidos = filtrosEscolhidos(valores);
  const [abertos, setAbertos] = useState(escolhidos > 0);
  const aplicar = () => formulario.current?.requestSubmit();

  return (
    <form
      ref={formulario}
      action="/ordens"
      data-tour="busca"
      className="flex flex-wrap items-center gap-2"
    >
      {valores.situacao && <input type="hidden" name="situacao" value={valores.situacao} />}
      {valores.atrasadas && <input type="hidden" name="atrasadas" value={valores.atrasadas} />}

      <div className="relative min-w-0 flex-1 sm:basis-72">
        <MagnifyingGlassIcon
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-apagado"
        />
        <input
          name="busca"
          type="search"
          enterKeyHint="search"
          aria-label="Buscar ordens"
          defaultValue={valores.busca}
          placeholder="Buscar por cliente, aparelho, IMEI, telefone ou nº da OS"
          className={juntar(campo, "pl-10")}
        />
      </div>

      <button
        type="button"
        aria-expanded={abertos}
        aria-controls="filtros-da-lista"
        onClick={() => setAbertos((atual) => !atual)}
        className={juntar(botao("secundario"), "px-3 sm:hidden")}
      >
        <SlidersHorizontalIcon size={17} />
        Filtros
        {escolhidos > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primario px-1.5 text-[11px] font-bold text-primario-texto tabular-nums">
            {escolhidos}
          </span>
        )}
      </button>

      <div
        id="filtros-da-lista"
        className={juntar(
          "grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center",
          !abertos && "max-sm:hidden",
        )}
      >
        <select
          name="status"
          aria-label="Status"
          defaultValue={valores.status}
          onChange={aplicar}
          className={SELETOR_DO_FILTRO}
        >
          <option value="">Todos os status</option>
          {status.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>

        <select
          name="tecnico"
          aria-label="Técnico"
          defaultValue={valores.tecnico}
          onChange={aplicar}
          className={SELETOR_DO_FILTRO}
        >
          <option value="">Qualquer técnico</option>
          <option value="sem">Sem técnico</option>
          {equipe.map((pessoa) => (
            <option key={pessoa.id} value={pessoa.id}>
              {pessoa.first_name || pessoa.username}
            </option>
          ))}
        </select>

        <select
          name="ordem"
          aria-label="Ordenação"
          defaultValue={valores.ordem}
          onChange={aplicar}
          className={SELETOR_DO_FILTRO}
        >
          {ordenacoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>

        <button type="submit" className={juntar(botao("secundario"), "max-sm:hidden")}>
          Buscar
        </button>
      </div>
    </form>
  );
}
