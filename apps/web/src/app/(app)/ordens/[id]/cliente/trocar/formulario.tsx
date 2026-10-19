"use client";

import { useActionState, useState } from "react";
import { DeviceMobileIcon, LinkSimpleIcon, UserIcon } from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { formatarTelefone } from "@/lib/telefone";
import type { Cliente, Ordem } from "@/lib/tipos";
import { EscolhaDoAparelho } from "../../../nova/escolhaDoAparelho";
import { EscolhaDoCliente } from "../../../nova/escolhaDoCliente";
import { Secao } from "../../../nova/formulario";
import { trocarCliente } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

function ClienteAtual({ ordem }: { ordem: Ordem }) {
  return (
    <div className="rounded-xl border border-borda px-3.5 py-3">
      <p className="text-[13px] text-texto-apagado sm:text-xs">Hoje a ordem está com</p>
      <p className="truncate text-sm font-semibold">{ordem.cliente_nome}</p>
      <p className="text-sm text-texto-suave sm:text-[13px]">{formatarTelefone(ordem.cliente_telefone)}</p>
    </div>
  );
}

export function FormularioDaTroca({ ordem }: { ordem: Ordem }) {
  const [estado, acao, enviando] = useActionState(trocarCliente, INICIAL);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [clienteNovo, setClienteNovo] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [aparelho, setAparelho] = useState("");
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};
  const aparelhoVaiJunto = !ordem.aparelho_em_outras_ordens;

  function escolherCliente(escolhido: Cliente) {
    setCliente(escolhido);
    setClienteNovo(false);
    setAparelho(escolhido.aparelhos.length === 0 ? "novo" : "");
  }

  function cadastrarCliente(termo: string) {
    setCliente(null);
    setClienteNovo(true);
    setRascunho(termo);
    setAparelho("novo");
  }

  function buscarDeNovo() {
    setCliente(null);
    setClienteNovo(false);
    setRascunho("");
    setAparelho("");
  }

  return (
    <form action={acao}>
      <input type="hidden" name="id" value={ordem.id} />
      <Cartao>
        <div className="space-y-6">
          <Secao icone={UserIcon} titulo="Cliente certo" erro={erros.cliente} obrigatoria>
            <ClienteAtual ordem={ordem} />
            <EscolhaDoCliente
              escolhido={cliente}
              novo={clienteNovo}
              rascunho={rascunho}
              erros={erros}
              valores={valores}
              ignorar={ordem.cliente}
              onEscolher={escolherCliente}
              onNovo={cadastrarCliente}
              onTrocar={buscarDeNovo}
            />
          </Secao>

          <Secao icone={DeviceMobileIcon} titulo="Aparelho" erro={erros.aparelho}>
            {aparelhoVaiJunto ? (
              <p className="text-sm leading-relaxed text-texto-suave">
                O {ordem.aparelho_descricao} só tem esta ordem e vai junto para o cliente certo. Se os
                dados dele estiverem errados, corrija depois em Cliente e aparelho.
              </p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-texto-suave">
                  O {ordem.aparelho_descricao} tem outras ordens e continua com {ordem.cliente_nome}.
                  Escolha o aparelho do cliente certo ou cadastre outro.
                </p>
                <EscolhaDoAparelho
                  cliente={cliente}
                  clienteNovo={clienteNovo}
                  escolha={aparelho}
                  erros={erros}
                  valores={valores}
                  onEscolher={setAparelho}
                />
              </>
            )}
          </Secao>

          <p className="flex items-start gap-2.5 rounded-xl bg-realce px-3.5 py-3 text-sm leading-relaxed text-texto-suave">
            <LinkSimpleIcon size={17} className="mt-0.5 shrink-0 text-icone" />
            <span>
              Depois da troca, o link de acompanhamento muda e o antigo deixa de abrir. Mande o link novo
              pelo WhatsApp e reimprima o comprovante, que passa a sair com o cliente certo.
            </span>
          </p>
        </div>

        <div className="-mx-5 -mb-5 mt-6 flex flex-wrap items-center gap-3 border-t border-borda bg-realce px-5 py-4">
          <button type="submit" disabled={enviando} className={botao("primario")}>
            {enviando ? "Trocando..." : "Trocar o cliente"}
          </button>
          {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
        </div>
      </Cartao>
    </form>
  );
}
