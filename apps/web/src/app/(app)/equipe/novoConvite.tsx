"use client";

import { useActionState, useState } from "react";
import { CompartilharLink } from "@/componentes/CompartilharLink";
import { PaperPlaneTiltIcon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, seletor } from "@/componentes/ui/estilos";
import { mensagemDoConvite } from "@/lib/convites";
import { criarConvite, type EstadoDoConvite } from "./acoes";

const INICIAL: EstadoDoConvite = {};

export function NovoConvite({ assistencia }: { assistencia: string }) {
  const [estado, acao, enviando] = useActionState(criarConvite, INICIAL);
  const [mostrarFormulario, setMostrarFormulario] = useState(true);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  if (estado.convite && !mostrarFormulario && !enviando) {
    const { convite } = estado;
    return (
      <div className="space-y-4">
        <Mensagem tipo="sucesso">
          Convite criado para {convite.nome}.{" "}
          {convite.email
            ? `Mandamos por e-mail para ${convite.email}, mas você também pode mandar pelo WhatsApp.`
            : "Mande o link pelo WhatsApp ou copie e envie como preferir."}
        </Mensagem>
        <CompartilharLink url={convite.link} mensagem={mensagemDoConvite(convite, assistencia)} />
        <button
          type="button"
          onClick={() => setMostrarFormulario(true)}
          className={botao("fantasma", "sm")}
        >
          Convidar outra pessoa
        </button>
      </div>
    );
  }

  return (
    <form action={acao} onSubmit={() => setMostrarFormulario(false)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Nome" htmlFor="nome" erro={erros.nome}>
          <input id="nome" name="nome" required defaultValue={valores.nome} className={campo} />
        </CampoRotulado>
        <CampoRotulado rotulo="Papel" htmlFor="papel" erro={erros.papel}>
          <select
            id="papel"
            name="papel"
            defaultValue={valores.papel ?? "tecnico"}
            className={seletor}
          >
            <option value="tecnico">Técnico</option>
            <option value="atendente">Atendente</option>
            <option value="dono">Dono</option>
          </select>
        </CampoRotulado>
        <CampoRotulado
          rotulo="E-mail"
          htmlFor="email"
          erro={erros.email}
          dica="Opcional. Se preencher, o convite também vai por e-mail."
          className="sm:col-span-2"
        >
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={valores.email}
            className={campo}
          />
        </CampoRotulado>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          <PaperPlaneTiltIcon size={15} />
          {enviando ? "Criando..." : "Criar convite"}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
