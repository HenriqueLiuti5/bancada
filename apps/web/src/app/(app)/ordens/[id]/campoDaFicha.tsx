"use client";

import { useActionState, useRef, useState } from "react";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import type { Opcao } from "@/lib/tipos";
import { salvarNaFicha, type EstadoDaFicha } from "./acoes";

const INICIAL: EstadoDaFicha = {};

function Situacao({ estado, salvando }: { estado: EstadoDaFicha; salvando: boolean }) {
  if (salvando) return <p className="text-[13px] text-texto-apagado sm:text-xs">Salvando...</p>;
  if (estado.erro) return <Mensagem tipo="erro">{estado.erro}</Mensagem>;
  if (estado.salvo) return <Mensagem tipo="sucesso">Salvo.</Mensagem>;
  return null;
}

export function TecnicoDaOrdem({
  id,
  tecnico,
  equipe,
}: {
  id: number;
  tecnico: number | null;
  equipe: Opcao[];
}) {
  const [estado, acao, salvando] = useActionState(salvarNaFicha, INICIAL);
  const [valor, setValor] = useState(tecnico === null ? "" : String(tecnico));
  const formulario = useRef<HTMLFormElement>(null);

  return (
    <form ref={formulario} action={acao} className="space-y-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="campo" value="tecnico" />
      <select
        name="valor"
        aria-label="Técnico responsável"
        value={valor}
        onChange={(evento) => {
          setValor(evento.target.value);
          formulario.current?.requestSubmit();
        }}
        className={seletor}
      >
        <option value="">Ninguém ainda</option>
        {equipe.map((pessoa) => (
          <option key={pessoa.valor} value={pessoa.valor}>
            {pessoa.rotulo}
          </option>
        ))}
      </select>
      <Situacao estado={estado} salvando={salvando} />
    </form>
  );
}

export function PrazoPrometido({ id, prazo }: { id: number; prazo: string | null }) {
  const [estado, acao, salvando] = useActionState(salvarNaFicha, INICIAL);
  const [valor, setValor] = useState(prazo ?? "");
  const mudou = valor !== (prazo ?? "");

  return (
    <form action={acao} className="space-y-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="campo" value="prometida_para" />
      <div className="flex gap-2">
        <input
          type="date"
          name="valor"
          aria-label="Prazo prometido"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          className={juntar(campo, "min-w-0 flex-1")}
        />
        {mudou && (
          <button type="submit" disabled={salvando} className={botao("secundario")}>
            Salvar
          </button>
        )}
      </div>
      <Situacao estado={mudou ? { erro: estado.erro } : estado} salvando={salvando} />
    </form>
  );
}
