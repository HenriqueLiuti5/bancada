"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CabecalhoDaLoja } from "@/componentes/CabecalhoDaLoja";
import { ImageSquareIcon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { EscolhaDeImagem } from "@/componentes/ui/EscolhaDeImagem";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo } from "@/componentes/ui/estilos";
import { fotoPassaDoTamanho, TAMANHO_MAXIMO_DA_FOTO_EM_MB } from "@/lib/fotos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { formatarTelefone } from "@/lib/telefone";
import type { Assistencia, Loja } from "@/lib/tipos";
import { alterarLogo, salvarAssistencia, salvarLoja, type EstadoDaLogo } from "./acoes";

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

const INICIAL_DA_LOGO: EstadoDaLogo = {};

async function alterarSeCouber(anterior: EstadoDaLogo, dados: FormData): Promise<EstadoDaLogo> {
  const arquivo = dados.get("arquivo");
  if (dados.get("acao") === "enviar" && arquivo instanceof File && fotoPassaDoTamanho(arquivo)) {
    return { erro: `A imagem passa de ${TAMANHO_MAXIMO_DA_FOTO_EM_MB} MB.` };
  }
  return alterarLogo(anterior, dados);
}

function BotoesDaLogo({ temLogo, escolhida }: { temLogo: boolean; escolhida: boolean }) {
  const { pending, data } = useFormStatus();
  const acao = pending ? data?.get("acao") : null;

  return (
    <>
      <button
        type="submit"
        name="acao"
        value="enviar"
        disabled={pending || !escolhida}
        className={botao("primario")}
      >
        {acao === "enviar" ? "Salvando..." : "Salvar logo"}
      </button>
      {temLogo && (
        <button
          type="submit"
          name="acao"
          value="remover"
          disabled={pending}
          className={botao("perigo")}
        >
          {acao === "remover" ? "Removendo..." : "Remover logo"}
        </button>
      )}
    </>
  );
}

export function FormularioDaLogo({ assistencia }: { assistencia: Assistencia }) {
  const [estado, acao] = useActionState(alterarSeCouber, INICIAL_DA_LOGO);
  const [arquivo, setArquivo] = useState("");
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-borda bg-fundo p-4 sm:p-5">
        <p className="mb-3 text-xs font-semibold text-texto-apagado">Como o cliente vê</p>
        <CabecalhoDaLoja
          nome={assistencia.nome}
          detalhe="Ordem de serviço nº 128"
          logo={assistencia.logo}
        />
      </div>

      <form
        ref={formulario}
        action={acao}
        onReset={() => setArquivo("")}
        className="space-y-4"
      >
        <EscolhaDeImagem
          nome={arquivo}
          aoEscolher={setArquivo}
          titulo={assistencia.logo ? "Escolher outra imagem" : "Escolher a imagem da logo"}
          dica={`PNG, JPG ou WebP, até ${TAMANHO_MAXIMO_DA_FOTO_EM_MB} MB. Com fundo transparente fica melhor.`}
          icone={ImageSquareIcon}
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
          <BotoesDaLogo temLogo={Boolean(assistencia.logo)} escolhida={Boolean(arquivo)} />
          {estado.ok && <Mensagem tipo="sucesso">{estado.ok}</Mensagem>}
          {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
        </div>
      </form>
    </div>
  );
}
