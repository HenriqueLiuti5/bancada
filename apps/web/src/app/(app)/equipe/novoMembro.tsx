"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, seletor } from "@/componentes/ui/estilos";
import { criarUsuario, type EstadoDaEquipe } from "./acoes";

const INICIAL: EstadoDaEquipe = {};

export function NovoMembro() {
  const [estado, acao, enviando] = useActionState(criarUsuario, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Nome" htmlFor="first_name">
          <input id="first_name" name="first_name" className={campo} />
        </CampoRotulado>
        <CampoRotulado rotulo="Usuário para entrar" htmlFor="username">
          <input id="username" name="username" required autoComplete="off" className={campo} />
        </CampoRotulado>
        <CampoRotulado rotulo="E-mail" htmlFor="email" dica="Opcional.">
          <input id="email" name="email" type="email" className={campo} />
        </CampoRotulado>
        <CampoRotulado rotulo="Papel" htmlFor="papel">
          <select id="papel" name="papel" defaultValue="tecnico" className={seletor}>
            <option value="tecnico">Técnico</option>
            <option value="atendente">Atendente</option>
            <option value="dono">Dono</option>
          </select>
        </CampoRotulado>
        <CampoRotulado
          rotulo="Senha inicial"
          htmlFor="senha"
          dica="Pelo menos 8 caracteres, sem ser só números nem algo óbvio."
          className="sm:col-span-2"
        >
          <input
            id="senha"
            name="senha"
            type="password"
            required
            autoComplete="new-password"
            className={campo}
          />
        </CampoRotulado>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          <UserPlus size={15} strokeWidth={2} />
          {enviando ? "Adicionando..." : "Adicionar à equipe"}
        </button>
        {estado.ok && <Mensagem tipo="sucesso">{estado.ok}</Mensagem>}
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
