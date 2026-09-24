"use client";

import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { formatarTelefone } from "@/lib/telefone";
import type { Assistencia, Loja } from "@/lib/tipos";
import { salvarAssistencia, salvarLoja } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

function Rodape({ estado, enviando }: { estado: EstadoDoFormulario; enviando: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
      <button type="submit" disabled={enviando} className={botao("primario")}>
        {enviando ? "Salvando..." : "Salvar"}
      </button>
      {estado.ok && <Mensagem tipo="sucesso">{estado.ok}</Mensagem>}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </div>
  );
}

export function FormularioDaAssistencia({ assistencia }: { assistencia: Assistencia }) {
  const [estado, acao, enviando] = useActionState(salvarAssistencia, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {
    ...assistencia,
    whatsapp: formatarTelefone(assistencia.whatsapp),
  };

  return (
    <form action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Nome da assistência" htmlFor="nome" erro={erros.nome} className="sm:col-span-2">
          <input id="nome" name="nome" required defaultValue={valores.nome} className={campo} />
        </CampoRotulado>
        <CampoRotulado
          rotulo="CNPJ"
          htmlFor="documento"
          erro={erros.documento}
          dica="Opcional. Aparece no comprovante e no recibo."
        >
          <input id="documento" name="documento" defaultValue={valores.documento} className={campo} />
        </CampoRotulado>
        <CampoRotulado
          rotulo="WhatsApp"
          htmlFor="whatsapp"
          erro={erros.whatsapp}
          dica="É por ele que a equipe do Bancada fala com você."
        >
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            required
            inputMode="tel"
            defaultValue={valores.whatsapp}
            className={campo}
          />
        </CampoRotulado>
      </div>
      <Rodape estado={estado} enviando={enviando} />
    </form>
  );
}

export function FormularioDaLoja({ loja }: { loja: Loja }) {
  const [estado, acao, enviando] = useActionState(salvarLoja, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? { ...loja, telefone: formatarTelefone(loja.telefone) };
  const prefixo = `loja-${loja.id}`;

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={loja.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Nome da loja" htmlFor={`${prefixo}-nome`} erro={erros.nome}>
          <input
            id={`${prefixo}-nome`}
            name="nome"
            required
            defaultValue={valores.nome}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="Telefone" htmlFor={`${prefixo}-telefone`} erro={erros.telefone}>
          <input
            id={`${prefixo}-telefone`}
            name="telefone"
            type="tel"
            inputMode="tel"
            defaultValue={valores.telefone}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado
          rotulo="Endereço"
          htmlFor={`${prefixo}-endereco`}
          erro={erros.endereco}
          className="sm:col-span-2"
        >
          <input
            id={`${prefixo}-endereco`}
            name="endereco"
            autoComplete="street-address"
            defaultValue={valores.endereco}
            className={campo}
          />
        </CampoRotulado>
      </div>
      <Rodape estado={estado} enviando={enviando} />
    </form>
  );
}
