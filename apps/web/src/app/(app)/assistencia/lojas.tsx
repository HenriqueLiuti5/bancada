"use client";

import { useActionState, useState } from "react";
import { ArrowUUpLeftIcon, MapPinIcon, PlusIcon, ProhibitIcon } from "@/componentes/icones";
import { CampoDeTelefone } from "@/componentes/ui/CampoDeTelefone";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { RodapeDoFormulario } from "@/componentes/ui/RodapeDoFormulario";
import { botao, campo } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { formatarTelefone } from "@/lib/telefone";
import type { Loja } from "@/lib/tipos";
import {
  ativarOuDesativarLoja,
  criarLoja,
  salvarLoja,
  type EstadoDaLoja,
} from "./acoes";

const INICIAL: EstadoDoFormulario = {};
const INICIAL_DA_ATIVACAO: EstadoDaLoja = {};

type Campos = { prefixo: string; valores: Record<string, string>; erros: Record<string, string> };

function CamposDaLoja({ prefixo, valores, erros }: Campos) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoRotulado rotulo="Nome da loja" htmlFor={`${prefixo}-nome`} erro={erros.nome} obrigatorio>
        <input
          id={`${prefixo}-nome`}
          name="nome"
          required
          defaultValue={valores.nome}
          className={campo}
        />
      </CampoRotulado>
      <CampoDeTelefone
        rotulo="Telefone"
        id={`${prefixo}-telefone`}
        name="telefone"
        erro={erros.telefone}
        valorInicial={valores.telefone}
        dica="Opcional. Sai no comprovante e no link do cliente."
      />
      <CampoRotulado
        rotulo="Endereço"
        htmlFor={`${prefixo}-endereco`}
        erro={erros.endereco}
        dica="Opcional. Sai no comprovante e no recibo."
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
  );
}

function FormularioDaLoja({ loja }: { loja: Loja }) {
  const [estado, acao, enviando] = useActionState(salvarLoja, INICIAL);
  const valores = estado.valores ?? {
    nome: loja.nome,
    telefone: formatarTelefone(loja.telefone),
    endereco: loja.endereco,
  };

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={loja.id} />
      <AvisoDeObrigatorios />
      <CamposDaLoja prefixo={`loja-${loja.id}`} valores={valores} erros={estado.erros ?? {}} />
      <RodapeDoFormulario estado={estado} enviando={enviando} />
    </form>
  );
}

type PropsDoCartao = { loja: Loja; titulo: string; podeDesativar: boolean };

export function CartaoDaLoja({ loja, titulo, podeDesativar }: PropsDoCartao) {
  const [estado, acao, enviando] = useActionState(ativarOuDesativarLoja, INICIAL_DA_ATIVACAO);

  return (
    <Cartao
      titulo={titulo}
      icone={MapPinIcon}
      descricao="Telefone e endereço aparecem para o cliente."
      acoes={
        podeDesativar && (
          <form action={acao}>
            <input type="hidden" name="id" value={loja.id} />
            <input type="hidden" name="ativa" value="nao" />
            <button
              type="submit"
              disabled={enviando}
              aria-label={`Desativar ${loja.nome}`}
              className={botao("fantasma", "sm")}
            >
              <ProhibitIcon size={15} />
              {enviando ? "Desativando..." : "Desativar"}
            </button>
          </form>
        )
      }
    >
      {estado.erro && (
        <div className="mb-4">
          <Mensagem tipo="erro">{estado.erro}</Mensagem>
        </div>
      )}
      <FormularioDaLoja loja={loja} />
    </Cartao>
  );
}

export function LojaDesativada({ loja }: { loja: Loja }) {
  const [estado, acao, enviando] = useActionState(ativarOuDesativarLoja, INICIAL_DA_ATIVACAO);
  const detalhe = [loja.endereco, formatarTelefone(loja.telefone)].filter(Boolean).join(" · ");

  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{loja.nome}</p>
          {detalhe && (
            <p className="truncate text-sm text-texto-apagado sm:text-[13px]">{detalhe}</p>
          )}
        </div>
        <form action={acao}>
          <input type="hidden" name="id" value={loja.id} />
          <input type="hidden" name="ativa" value="sim" />
          <button
            type="submit"
            disabled={enviando}
            aria-label={`Reativar ${loja.nome}`}
            className={botao("secundario", "sm")}
          >
            <ArrowUUpLeftIcon size={15} />
            {enviando ? "Reativando..." : "Reativar"}
          </button>
        </form>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </li>
  );
}

// O formulário fica recolhido porque a maioria das assistências tem uma loja só. Ele fecha quando a
// loja é criada, e o Cancelar descarta o que a última tentativa deixou nos campos.
export function NovaLoja() {
  const [estado, acao, enviando] = useActionState(criarLoja, INICIAL);
  const [aberto, setAberto] = useState(false);
  const [visto, setVisto] = useState(estado);
  const [descartado, setDescartado] = useState<EstadoDoFormulario | null>(null);

  if (estado !== visto) {
    setVisto(estado);
    if (estado.ok) setAberto(false);
  }

  const atual = estado === descartado ? INICIAL : estado;

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setAberto(true)} className={botao("secundario")}>
          <PlusIcon size={16} />
          Adicionar loja
        </button>
        {atual.ok && <Mensagem tipo="sucesso">{atual.ok}</Mensagem>}
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <AvisoDeObrigatorios />
      <CamposDaLoja prefixo="nova-loja" valores={atual.valores ?? {}} erros={atual.erros ?? {}} />
      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          {enviando ? "Criando..." : "Criar loja"}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => {
            setAberto(false);
            setDescartado(estado);
          }}
          className={botao("fantasma")}
        >
          Cancelar
        </button>
        {atual.erro && <Mensagem tipo="erro">{atual.erro}</Mensagem>}
      </div>
    </form>
  );
}
