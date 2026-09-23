"use client";

import { useActionState, useState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { areaDeTexto, botao, seletor } from "@/componentes/ui/estilos";
import type { Cliente, Loja } from "@/lib/tipos";
import { abrirOrdem, type EstadoAbertura } from "./acoes";

const INICIAL: EstadoAbertura = {};

export function FormularioDeAbertura({ lojas, clientes }: { lojas: Loja[]; clientes: Cliente[] }) {
  const [estado, acao, enviando] = useActionState(abrirOrdem, INICIAL);
  const [clienteId, setClienteId] = useState<string>("");

  const selecionado = clientes.find((cliente) => String(cliente.id) === clienteId);
  const aparelhos = selecionado?.aparelhos ?? [];

  return (
    <form action={acao}>
      <Cartao>
        <div className="space-y-5">
          {lojas.length > 1 ? (
            <CampoRotulado rotulo="Loja" htmlFor="loja">
              <select id="loja" name="loja" defaultValue={lojas[0]?.id ?? ""} className={seletor}>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
            </CampoRotulado>
          ) : (
            <input type="hidden" name="loja" value={lojas[0]?.id ?? ""} />
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoRotulado rotulo="Cliente" htmlFor="cliente">
              <select
                id="cliente"
                name="cliente"
                value={clienteId}
                onChange={(evento) => setClienteId(evento.target.value)}
                className={seletor}
              >
                <option value="">Selecione</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} · {cliente.telefone}
                  </option>
                ))}
              </select>
            </CampoRotulado>

            <CampoRotulado rotulo="Aparelho" htmlFor="aparelho">
              <select id="aparelho" name="aparelho" disabled={!clienteId} className={seletor}>
                <option value="">{clienteId ? "Selecione" : "Escolha o cliente primeiro"}</option>
                {aparelhos.map((aparelho) => (
                  <option key={aparelho.id} value={aparelho.id}>
                    {aparelho.descricao}
                    {aparelho.cor && ` · ${aparelho.cor}`}
                  </option>
                ))}
              </select>
            </CampoRotulado>
          </div>

          <CampoRotulado
            rotulo="Problema relatado"
            htmlFor="problema_relatado"
            dica="Escreva como o cliente descreveu. Aparece no comprovante que ele assina."
          >
            <textarea
              id="problema_relatado"
              name="problema_relatado"
              rows={4}
              placeholder="Ex.: não carrega desde que caiu na água"
              className={areaDeTexto}
            />
          </CampoRotulado>
        </div>

        <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center gap-3 border-t border-borda bg-realce px-5 py-3">
          <button type="submit" disabled={enviando} className={botao("primario")}>
            {enviando ? "Abrindo..." : "Abrir ordem de serviço"}
          </button>
          {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
        </div>
      </Cartao>
    </form>
  );
}
