"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { CabecalhoDaLoja } from "@/componentes/CabecalhoDaLoja";
import { CheckCircleIcon, ImageSquareIcon } from "@/componentes/icones";
import { CampoDeTelefone } from "@/componentes/ui/CampoDeTelefone";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { EscolhaDeImagem } from "@/componentes/ui/EscolhaDeImagem";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { RodapeDoFormulario } from "@/componentes/ui/RodapeDoFormulario";
import { botao, campo, seletor } from "@/componentes/ui/estilos";
import { horaEMinuto } from "@/lib/datas";
import { fotoPassaDoTamanho, TAMANHO_MAXIMO_DA_FOTO_EM_MB } from "@/lib/fotos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { FUSOS_DO_BRASIL } from "@/lib/fusos";
import { formatarTelefone } from "@/lib/telefone";
import type { Assistencia } from "@/lib/tipos";
import { alterarLogo, salvarAssistencia, type EstadoDaLogo } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

const UM_MINUTO = 60_000;

function minutoAtual(): number {
  return Math.floor(Date.now() / UM_MINUTO);
}

function acompanharORelogio(avisar: () => void): () => void {
  const relogio = window.setInterval(avisar, 1_000);
  return () => window.clearInterval(relogio);
}

// A hora só é escrita no navegador. A do servidor pode estar num minuto e a do navegador no
// seguinte, e o React acusaria a diferença ao ligar a página.
function CampoDoFuso({ valorInicial, erro }: { valorInicial: string; erro?: string }) {
  const [fuso, setFuso] = useState(valorInicial);
  const minuto = useSyncExternalStore(acompanharORelogio, minutoAtual, () => null);
  const agora = minuto === null ? null : horaEMinuto(new Date(minuto * UM_MINUTO), fuso);

  return (
    <CampoRotulado
      rotulo="Fuso horário"
      htmlFor="fuso_horario"
      erro={erro}
      className="sm:col-span-2"
      obrigatorio
      dica={
        agora ? (
          <span className="flex items-start gap-1.5 text-texto-suave">
            <CheckCircleIcon size={15} weight="fill" className="mt-px shrink-0 text-sucesso" />
            <span>Confira: agora são {agora} nesse fuso.</span>
          </span>
        ) : (
          "As horas das telas, dos documentos e dos avisos seguem esse fuso."
        )
      }
    >
      <select
        id="fuso_horario"
        name="fuso_horario"
        defaultValue={valorInicial}
        onChange={(evento) => setFuso(evento.target.value)}
        aria-describedby={erro ? "fuso_horario-erro" : "fuso_horario-dica"}
        className={seletor}
      >
        {FUSOS_DO_BRASIL.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </CampoRotulado>
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
      <AvisoDeObrigatorios />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado
          rotulo="Nome da assistência"
          htmlFor="nome"
          erro={erros.nome}
          className="sm:col-span-2"
          obrigatorio
        >
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
        <CampoDeTelefone
          rotulo="WhatsApp"
          id="whatsapp"
          name="whatsapp"
          erro={erros.whatsapp}
          valorInicial={valores.whatsapp}
          dica="É por ele que a equipe do Bancada fala com você."
          obrigatorio
        />
        {/* O React limpa o formulário depois de cada envio e só lê o defaultValue de um select
            quando ele nasce: a chave o recria com o fuso que foi enviado. */}
        <CampoDoFuso
          key={valores.fuso_horario}
          valorInicial={valores.fuso_horario}
          erro={erros.fuso_horario}
        />
      </div>
      <RodapeDoFormulario estado={estado} enviando={enviando} />
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
