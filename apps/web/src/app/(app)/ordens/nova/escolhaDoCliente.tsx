"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, UserPlusIcon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import { formatarTelefone } from "@/lib/telefone";
import type { Cliente } from "@/lib/tipos";
import { buscarClientes } from "./acoes";

const MINIMO_PARA_BUSCAR = 2;
const ESPERA_ANTES_DE_BUSCAR_MS = 250;
const DIGITOS_QUE_INDICAM_TELEFONE = 8;

type Resultado = { termo: string; clientes: Cliente[] };

type Props = {
  escolhido: Cliente | null;
  novo: boolean;
  rascunho: string;
  erros: Record<string, string>;
  valores: Record<string, string>;
  onEscolher: (cliente: Cliente) => void;
  onNovo: (termo: string) => void;
  onTrocar: () => void;
};

function pareceTelefone(texto: string): boolean {
  return texto.replace(/\D/g, "").length >= DIGITOS_QUE_INDICAM_TELEFONE;
}

function Busca({ onEscolher, onNovo }: Pick<Props, "onEscolher" | "onNovo">) {
  const [termo, setTermo] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const procurado = termo.trim();

  useEffect(() => {
    if (procurado.length < MINIMO_PARA_BUSCAR) return;

    let atual = true;
    const espera = setTimeout(async () => {
      try {
        const clientes = await buscarClientes(procurado);
        if (atual) setResultado({ termo: procurado, clientes });
      } catch {
        if (atual) setResultado({ termo: procurado, clientes: [] });
      }
    }, ESPERA_ANTES_DE_BUSCAR_MS);

    return () => {
      atual = false;
      clearTimeout(espera);
    };
  }, [procurado]);

  const pronto = procurado.length >= MINIMO_PARA_BUSCAR && resultado?.termo === procurado;
  const clientes = pronto ? resultado.clientes : [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlassIcon
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-apagado"
        />
        <input
          type="search"
          aria-label="Buscar cliente por nome ou telefone"
          placeholder="Buscar por nome ou telefone"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          autoComplete="off"
          autoFocus
          className={juntar(campo, "pl-10")}
        />
      </div>

      {clientes.length > 0 && (
        <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda shadow-suave">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <button
                type="button"
                onClick={() => onEscolher(cliente)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-realce sm:py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{cliente.nome}</span>
                  <span className="block text-sm text-texto-suave sm:text-[13px]">
                    {formatarTelefone(cliente.telefone)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-texto-apagado">
                  {cliente.aparelhos.length}{" "}
                  {cliente.aparelhos.length === 1 ? "aparelho" : "aparelhos"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pronto && clientes.length === 0 && (
        <p className="text-sm text-texto-suave sm:text-[13px]">
          Nenhum cliente encontrado com “{procurado}”. Cadastre abaixo.
        </p>
      )}

      <button type="button" onClick={() => onNovo(procurado)} className={botao("secundario", "sm")}>
        <UserPlusIcon size={14} />
        Cadastrar cliente novo
      </button>
    </div>
  );
}

function CamposDoClienteNovo({ rascunho, erros, valores }: Pick<Props, "rascunho" | "erros" | "valores">) {
  const telefoneSugerido = pareceTelefone(rascunho) ? rascunho : "";
  const nomeSugerido = telefoneSugerido ? "" : rascunho;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="modo_cliente" value="novo" />
      <CampoRotulado rotulo="Nome" htmlFor="cliente-nome" erro={erros["cliente_novo.nome"]}>
        <input
          id="cliente-nome"
          name="cliente_novo.nome"
          required
          autoFocus={!nomeSugerido}
          defaultValue={valores["cliente_novo.nome"] ?? nomeSugerido}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado
        rotulo="Telefone / WhatsApp"
        htmlFor="cliente-telefone"
        erro={erros["cliente_novo.telefone"]}
      >
        <input
          id="cliente-telefone"
          name="cliente_novo.telefone"
          type="tel"
          inputMode="tel"
          required
          placeholder="(11) 91234-5678"
          autoFocus={Boolean(nomeSugerido)}
          defaultValue={valores["cliente_novo.telefone"] ?? telefoneSugerido}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado
        rotulo="E-mail"
        htmlFor="cliente-email"
        erro={erros["cliente_novo.email"]}
        dica="Opcional. Se tiver, o cliente recebe o link de acompanhamento na hora."
      >
        <input
          id="cliente-email"
          name="cliente_novo.email"
          type="email"
          defaultValue={valores["cliente_novo.email"]}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado
        rotulo="CPF"
        htmlFor="cliente-documento"
        erro={erros["cliente_novo.documento"]}
        dica="Opcional."
      >
        <input
          id="cliente-documento"
          name="cliente_novo.documento"
          inputMode="numeric"
          defaultValue={valores["cliente_novo.documento"]}
          className={campo}
        />
      </CampoRotulado>
    </div>
  );
}

export function EscolhaDoCliente(props: Props) {
  const { escolhido, novo, onTrocar } = props;

  if (escolhido) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-anel bg-destaque-suave px-3.5 py-3">
        <input type="hidden" name="modo_cliente" value="existente" />
        <input type="hidden" name="cliente" value={escolhido.id} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{escolhido.nome}</p>
          <p className="text-sm text-texto-suave sm:text-[13px]">{formatarTelefone(escolhido.telefone)}</p>
        </div>
        <button type="button" onClick={onTrocar} className={botao("fantasma", "sm")}>
          Trocar
        </button>
      </div>
    );
  }

  if (novo) {
    return (
      <div className="space-y-3">
        <CamposDoClienteNovo rascunho={props.rascunho} erros={props.erros} valores={props.valores} />
        <button type="button" onClick={onTrocar} className={botao("fantasma", "sm")}>
          Buscar cliente já cadastrado
        </button>
      </div>
    );
  }

  return <Busca onEscolher={props.onEscolher} onNovo={props.onNovo} />;
}
