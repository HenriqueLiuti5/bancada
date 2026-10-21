"use client";

import { useActionState, useState } from "react";
import { ArrowUUpLeftIcon, ArrowsLeftRightIcon, ListChecksIcon, ProhibitIcon } from "@/componentes/icones";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { RodapeDoFormulario } from "@/componentes/ui/RodapeDoFormulario";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { reaisParaCampo } from "@/lib/moeda";
import type { Loja, Produto } from "@/lib/tipos";
import {
  ativarOuDesativarProduto,
  corrigirContagem,
  registrarEntrada,
  salvarProduto,
  transferir,
  type EstadoSimples,
} from "../acoes";
import { CamposDoProduto } from "../camposDoProduto";

const INICIAL: EstadoDoFormulario = {};
const INICIAL_SIMPLES: EstadoSimples = {};

export function DadosDoProduto({ produto }: { produto: Produto }) {
  const [estado, acao, enviando] = useActionState(salvarProduto, INICIAL);
  const valores = estado.valores ?? {
    nome: produto.nome,
    tipo: produto.tipo,
    codigo: produto.codigo,
    custo: reaisParaCampo(produto.custo),
    preco: reaisParaCampo(produto.preco),
    minimo: String(produto.minimo),
  };

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={produto.id} />
      <CamposDoProduto prefixo="produto" valores={valores} erros={estado.erros ?? {}} estreito />
      <RodapeDoFormulario estado={estado} enviando={enviando} />
    </form>
  );
}

export function AtivacaoDoProduto({ produto }: { produto: Produto }) {
  const [estado, acao, enviando] = useActionState(ativarOuDesativarProduto, INICIAL_SIMPLES);

  return (
    <form action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={produto.id} />
      <input type="hidden" name="ativo" value={produto.ativo ? "nao" : "sim"} />
      {produto.ativo ? (
        <button type="submit" disabled={enviando} className={botao("fantasma", "sm")}>
          <ProhibitIcon size={15} />
          {enviando ? "Desativando..." : "Desativar"}
        </button>
      ) : (
        <button type="submit" disabled={enviando} className={botao("secundario", "sm")}>
          <ArrowUUpLeftIcon size={15} />
          {enviando ? "Reativando..." : "Reativar"}
        </button>
      )}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}

function EscolhaDaLoja({
  id,
  nome,
  rotulo,
  lojas,
  valor,
  erro,
}: {
  id: string;
  nome: string;
  rotulo: string;
  lojas: Loja[];
  valor?: string;
  erro?: string;
}) {
  return (
    <CampoRotulado rotulo={rotulo} htmlFor={id} erro={erro}>
      <select key={valor} id={id} name={nome} defaultValue={valor ?? String(lojas[0].id)} className={seletor}>
        {lojas.map((loja) => (
          <option key={loja.id} value={loja.id}>
            {loja.nome}
          </option>
        ))}
      </select>
    </CampoRotulado>
  );
}

type PropsDaEntrada = { produto: Produto; lojas: Loja[]; fornecedores: string[] };

export function EntradaDeCompra({ produto, lojas, fornecedores }: PropsDaEntrada) {
  const [estado, acao, enviando] = useActionState(registrarEntrada, INICIAL);
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={produto.id} />
      <AvisoDeObrigatorios />
      <div className="grid gap-4 sm:grid-cols-2">
        {lojas.length > 1 && (
          <EscolhaDaLoja
            id="entrada-loja"
            nome="loja"
            rotulo="Chegou em qual loja"
            lojas={lojas}
            valor={valores.loja}
            erro={erros.loja}
          />
        )}
        <CampoRotulado
          rotulo="Quantidade"
          htmlFor="entrada-quantidade"
          erro={erros.quantidade}
          obrigatorio
        >
          <input
            id="entrada-quantidade"
            name="quantidade"
            inputMode="numeric"
            autoComplete="off"
            required
            defaultValue={valores.quantidade}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
        <CampoRotulado
          rotulo="Custo de cada unidade"
          htmlFor="entrada-custo"
          erro={erros.custo_unitario}
          obrigatorio
          dica="O custo do produto passa a ser a média com o que já havia."
        >
          <input
            id="entrada-custo"
            name="custo_unitario"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={valores.custo_unitario ?? reaisParaCampo(produto.custo)}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
        <CampoRotulado
          rotulo="Fornecedor"
          htmlFor="entrada-fornecedor"
          erro={erros.fornecedor}
          dica="Opcional."
          className={lojas.length > 1 ? "" : "sm:col-span-2"}
        >
          <input
            id="entrada-fornecedor"
            name="fornecedor"
            list="fornecedores-conhecidos"
            maxLength={120}
            autoComplete="off"
            defaultValue={valores.fornecedor}
            className={campo}
          />
          <datalist id="fornecedores-conhecidos">
            {fornecedores.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        </CampoRotulado>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          {enviando ? "Registrando..." : "Registrar entrada"}
        </button>
        {estado.ok && <Mensagem tipo="sucesso">{estado.ok}</Mensagem>}
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}

// Os formulários da contagem e da transferência ficam recolhidos porque são raros. Eles fecham
// quando dão certo, e o Cancelar descarta o que a última tentativa deixou nos campos.
function useRecolhivel(estado: EstadoDoFormulario) {
  const [aberto, setAberto] = useState(false);
  const [visto, setVisto] = useState(estado);
  const [descartado, setDescartado] = useState<EstadoDoFormulario | null>(null);

  if (estado !== visto) {
    setVisto(estado);
    if (estado.ok) setAberto(false);
  }

  const atual = estado === descartado ? INICIAL : estado;
  const fechar = () => {
    setAberto(false);
    setDescartado(estado);
  };
  return { aberto, abrir: () => setAberto(true), fechar, atual };
}

function Rodape({
  enviando,
  rotulo,
  enviandoRotulo,
  erro,
  aoCancelar,
}: {
  enviando: boolean;
  rotulo: string;
  enviandoRotulo: string;
  erro?: string;
  aoCancelar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="submit" disabled={enviando} className={botao("primario", "sm")}>
        {enviando ? enviandoRotulo : rotulo}
      </button>
      <button type="button" disabled={enviando} onClick={aoCancelar} className={botao("fantasma", "sm")}>
        Cancelar
      </button>
      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
    </div>
  );
}

export function CorrecaoDaContagem({ produto, lojas }: { produto: Produto; lojas: Loja[] }) {
  const [estado, acao, enviando] = useActionState(corrigirContagem, INICIAL);
  const { aberto, abrir, fechar, atual } = useRecolhivel(estado);
  const valores = atual.valores ?? {};
  const erros = atual.erros ?? {};

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={abrir} className={botao("secundario", "sm")}>
          <ListChecksIcon size={15} />
          Corrigir a contagem
        </button>
        {atual.ok && <Mensagem tipo="sucesso">{atual.ok}</Mensagem>}
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-borda p-4">
      <input type="hidden" name="id" value={produto.id} />
      <p className="text-[13px] text-texto-apagado">
        Conte o que há na prateleira. O sistema guarda a diferença com o seu nome.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {lojas.length > 1 && (
          <EscolhaDaLoja
            id="contagem-loja"
            nome="loja"
            rotulo="Loja"
            lojas={lojas}
            valor={valores.loja}
            erro={erros.loja}
          />
        )}
        <CampoRotulado rotulo="Quantas você contou" htmlFor="contagem-contada" erro={erros.contada} obrigatorio>
          <input
            id="contagem-contada"
            name="contada"
            inputMode="numeric"
            autoComplete="off"
            required
            autoFocus
            defaultValue={valores.contada}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
        <CampoRotulado
          rotulo="Motivo"
          htmlFor="contagem-observacao"
          erro={erros.observacao}
          dica="Opcional. Ex.: uma quebrou na instalação."
          className={lojas.length > 1 ? "sm:col-span-2" : ""}
        >
          <input
            id="contagem-observacao"
            name="observacao"
            maxLength={200}
            defaultValue={valores.observacao}
            className={campo}
          />
        </CampoRotulado>
      </div>
      <Rodape
        enviando={enviando}
        rotulo="Salvar contagem"
        enviandoRotulo="Salvando..."
        erro={atual.erro}
        aoCancelar={fechar}
      />
    </form>
  );
}

export function TransferenciaEntreLojas({ produto, lojas }: { produto: Produto; lojas: Loja[] }) {
  const [estado, acao, enviando] = useActionState(transferir, INICIAL);
  const { aberto, abrir, fechar, atual } = useRecolhivel(estado);
  const valores = atual.valores ?? {};
  const erros = atual.erros ?? {};

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={abrir} className={botao("secundario", "sm")}>
          <ArrowsLeftRightIcon size={15} />
          Transferir entre lojas
        </button>
        {atual.ok && <Mensagem tipo="sucesso">{atual.ok}</Mensagem>}
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-borda p-4">
      <input type="hidden" name="id" value={produto.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <EscolhaDaLoja id="transferencia-de" nome="de" rotulo="Sai de" lojas={lojas} valor={valores.de} erro={erros.de} />
        <EscolhaDaLoja
          id="transferencia-para"
          nome="para"
          rotulo="Vai para"
          lojas={lojas}
          valor={valores.para ?? String(lojas[1].id)}
          erro={erros.para}
        />
        <CampoRotulado rotulo="Quantidade" htmlFor="transferencia-quantidade" erro={erros.quantidade} obrigatorio>
          <input
            id="transferencia-quantidade"
            name="quantidade"
            inputMode="numeric"
            autoComplete="off"
            required
            autoFocus
            defaultValue={valores.quantidade}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
      </div>
      <Rodape
        enviando={enviando}
        rotulo="Transferir"
        enviandoRotulo="Transferindo..."
        erro={atual.erro}
        aoCancelar={fechar}
      />
    </form>
  );
}
