"use client";

import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { areaDeTexto, botao } from "@/componentes/ui/estilos";
import type { Ordem } from "@/lib/tipos";
import { salvarAnotacoes, type EstadoDasAnotacoes } from "./acoes";

const INICIAL: EstadoDasAnotacoes = {};

export function AnotacoesDoReparo({ ordem }: { ordem: Ordem }) {
  const [estado, acao, salvando] = useActionState(salvarAnotacoes, INICIAL);

  return (
    <form action={acao} className="space-y-4 p-5">
      <input type="hidden" name="id" value={ordem.id} />

      <CampoRotulado
        rotulo="Diagnóstico"
        htmlFor="diagnostico"
        dica="Uso interno. O cliente não vê."
      >
        <textarea
          id="diagnostico"
          name="diagnostico"
          rows={3}
          defaultValue={ordem.diagnostico}
          className={areaDeTexto}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Laudo"
        htmlFor="laudo"
        dica="Sai impresso no recibo de entrega."
      >
        <textarea id="laudo" name="laudo" rows={3} defaultValue={ordem.laudo} className={areaDeTexto} />
      </CampoRotulado>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={salvando} className={botao("secundario")}>
          {salvando ? "Salvando..." : "Salvar anotações"}
        </button>
        {estado.salvo && <Mensagem tipo="sucesso">Anotações salvas.</Mensagem>}
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
