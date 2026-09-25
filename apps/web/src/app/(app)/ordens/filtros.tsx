"use client";

import { Search } from "lucide-react";
import { useRef } from "react";
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
    <form
      ref={formulario}
      action="/ordens"
      data-tour="busca"
      className="flex flex-wrap items-center gap-2"
    >
      {valores.situacao && <input type="hidden" name="situacao" value={valores.situacao} />}
      {valores.atrasadas && <input type="hidden" name="atrasadas" value={valores.atrasadas} />}

      <div className="relative min-w-0 flex-1 basis-full sm:basis-72">
        <Search
          size={15}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-apagado"
        />
        <input
          name="busca"
          type="search"
          defaultValue={valores.busca}
          placeholder="Buscar por cliente, aparelho, IMEI, telefone ou nº da OS"
          className={juntar(campo, "pl-9")}
        />
      </div>

      <select
        name="status"
        aria-label="Status"
        defaultValue={valores.status}
        onChange={aplicar}
        className={juntar(seletor, "w-auto")}
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
        className={juntar(seletor, "w-auto")}
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
        className={juntar(seletor, "w-auto")}
      >
        {ordenacoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>

      <button type="submit" className={botao("secundario")}>
        Buscar
      </button>
    </form>
  );
}
