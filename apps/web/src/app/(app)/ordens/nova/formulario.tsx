"use client";

import { useActionState, useState } from "react";
import { ChatTextIcon, DeviceMobileIcon, UserIcon, type Icon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { areaDeTexto, botao, seletor } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import type { Cliente, Loja } from "@/lib/tipos";
import { abrirOrdem } from "./acoes";
import { EscolhaDoAparelho } from "./escolhaDoAparelho";
import { EscolhaDoCliente } from "./escolhaDoCliente";

const INICIAL: EstadoDoFormulario = {};

function aparelhoInicial(cliente: Cliente): string {
  if (cliente.aparelhos.length === 0) return "novo";
  if (cliente.aparelhos.length === 1) return String(cliente.aparelhos[0].id);
  return "";
}

function Secao({
  icone: Icone,
  titulo,
  erro,
  tour,
  children,
}: {
  icone: Icon;
  titulo: string;
  erro?: string;
  tour: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-tour={tour}
      className="space-y-4 border-t border-borda pt-6 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <h2 className="flex items-center gap-3 text-base font-bold">
        <Icone size={22} className="shrink-0 text-icone" />
        {titulo}
      </h2>
      {children}
      {erro && <p className="text-[13px] text-perigo sm:text-xs">{erro}</p>}
    </section>
  );
}

export function FormularioDeAbertura({ lojas }: { lojas: Loja[] }) {
  const [estado, acao, enviando] = useActionState(abrirOrdem, INICIAL);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clienteNovo, setClienteNovo] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [aparelho, setAparelho] = useState("");
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  function escolherCliente(escolhido: Cliente) {
    setCliente(escolhido);
    setClienteNovo(false);
    setAparelho(aparelhoInicial(escolhido));
  }

  function cadastrarCliente(termo: string) {
    setCliente(null);
    setClienteNovo(true);
    setRascunho(termo);
    setAparelho("novo");
  }

  function trocarCliente() {
    setCliente(null);
    setClienteNovo(false);
    setRascunho("");
    setAparelho("");
  }

  return (
    <form action={acao}>
      <Cartao>
        <div className="space-y-6">
          {lojas.length > 1 ? (
            <CampoRotulado rotulo="Loja" htmlFor="loja" erro={erros.loja}>
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

          <Secao icone={UserIcon} titulo="Cliente" tour="cliente" erro={erros.cliente}>
            <EscolhaDoCliente
              escolhido={cliente}
              novo={clienteNovo}
              rascunho={rascunho}
              erros={erros}
              valores={valores}
              onEscolher={escolherCliente}
              onNovo={cadastrarCliente}
              onTrocar={trocarCliente}
            />
          </Secao>

          <Secao icone={DeviceMobileIcon} titulo="Aparelho" tour="aparelho" erro={erros.aparelho}>
            <EscolhaDoAparelho
              cliente={cliente}
              clienteNovo={clienteNovo}
              escolha={aparelho}
              erros={erros}
              valores={valores}
              onEscolher={setAparelho}
            />
          </Secao>

          <Secao icone={ChatTextIcon} titulo="Defeito" tour="defeito">
            <CampoRotulado
              rotulo="Problema relatado"
              htmlFor="problema_relatado"
              erro={erros.problema_relatado}
              dica="Escreva como o cliente descreveu. Aparece no comprovante que ele assina."
            >
              <textarea
                id="problema_relatado"
                name="problema_relatado"
                rows={4}
                required
                placeholder="Ex.: não carrega desde que caiu na água"
                defaultValue={valores.problema_relatado}
                className={areaDeTexto}
              />
            </CampoRotulado>
          </Secao>
        </div>

        <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center gap-3 border-t border-borda bg-realce px-5 py-4">
          <button
            type="submit"
            disabled={enviando}
            data-tour="abrir"
            className={botao("primario")}
          >
            {enviando ? "Abrindo..." : "Abrir ordem de serviço"}
          </button>
          {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
        </div>
      </Cartao>
    </form>
  );
}
