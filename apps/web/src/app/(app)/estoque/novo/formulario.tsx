"use client";

import { useActionState } from "react";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import type { Loja } from "@/lib/tipos";
import { criarProduto } from "../acoes";
import { CamposDoProduto } from "../camposDoProduto";

const INICIAL: EstadoDoFormulario = {};

export function NovoProduto({ lojas }: { lojas: Loja[] }) {
  const [estado, acao, enviando] = useActionState(criarProduto, INICIAL);
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};

  return (
    <form action={acao} className="space-y-6">
      <AvisoDeObrigatorios />
      <CamposDoProduto prefixo="novo-produto" valores={valores} erros={erros} />

      <div className="grid gap-4 border-t border-borda pt-5 sm:grid-cols-2">
        <CampoRotulado
          rotulo="Quantidade agora"
          htmlFor="novo-produto-quantidade"
          erro={erros.quantidade}
          dica="Quantas unidades a loja tem hoje. Pode deixar em branco."
        >
          <input
            id="novo-produto-quantidade"
            name="quantidade"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            defaultValue={valores.quantidade}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>

        {lojas.length > 1 && (
          <CampoRotulado rotulo="Em qual loja" htmlFor="novo-produto-loja" erro={erros.loja}>
            <select
              key={valores.loja}
              id="novo-produto-loja"
              name="loja"
              defaultValue={valores.loja ?? String(lojas[0].id)}
              className={seletor}
            >
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome}
                </option>
              ))}
            </select>
          </CampoRotulado>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          {enviando ? "Cadastrando..." : "Cadastrar produto"}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
