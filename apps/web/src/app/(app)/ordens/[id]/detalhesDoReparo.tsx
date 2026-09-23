"use client";

import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { areaDeTexto, botao, campo, seletor } from "@/componentes/ui/estilos";
import type { Ordem, Usuario } from "@/lib/tipos";
import { salvarDetalhes, type EstadoDosDetalhes } from "./acoes";

const INICIAL: EstadoDosDetalhes = {};

export function DetalhesDoReparo({ ordem, equipe }: { ordem: Ordem; equipe: Usuario[] }) {
  const [estado, acao, salvando] = useActionState(salvarDetalhes, INICIAL);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={ordem.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Técnico responsável" htmlFor="tecnico">
          <select id="tecnico" name="tecnico" defaultValue={ordem.tecnico ?? ""} className={seletor}>
            <option value="">Ninguém ainda</option>
            {equipe.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.first_name || pessoa.username}
              </option>
            ))}
          </select>
        </CampoRotulado>

        <CampoRotulado rotulo="Prazo prometido" htmlFor="prometida_para">
          <input
            id="prometida_para"
            type="date"
            name="prometida_para"
            defaultValue={ordem.prometida_para ?? ""}
            className={campo}
          />
        </CampoRotulado>
      </div>

      <CampoRotulado
        rotulo="Diagnóstico"
        htmlFor="diagnostico"
        dica="Uso interno. O cliente não vê."
      >
        <textarea
          id="diagnostico"
          name="diagnostico"
          rows={2}
          defaultValue={ordem.diagnostico}
          className={areaDeTexto}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Laudo"
        htmlFor="laudo"
        dica="Sai impresso no recibo de entrega."
      >
        <textarea id="laudo" name="laudo" rows={2} defaultValue={ordem.laudo} className={areaDeTexto} />
      </CampoRotulado>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={salvando} className={botao("primario")}>
          {salvando ? "Salvando..." : "Salvar detalhes"}
        </button>
        {estado.salvo && <Mensagem tipo="sucesso">Detalhes salvos.</Mensagem>}
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
