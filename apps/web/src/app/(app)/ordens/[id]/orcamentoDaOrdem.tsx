"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { InvoiceIcon, PlusIcon, ReceiptIcon, TrashIcon } from "@/componentes/icones";
import { MarcaDeObrigatorio } from "@/componentes/ui/CampoRotulado";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { useOpcaoPadrao } from "@/componentes/useOpcaoPadrao";
import { quantidadeNaLoja, rotuloDoProduto } from "@/lib/estoque";
import { contagem } from "@/lib/formatos";
import { emReais, reaisParaCampo } from "@/lib/moeda";
import type { EscolhaDeProdutos, ItemOrcamento, Ordem, ProdutoParaEscolher } from "@/lib/tipos";
import { adicionarItem, apagarItem, type EstadoDoItem } from "./acoes";

const INICIAL: EstadoDoItem = {};

const ROTULO_DO_CAMPO = "block text-xs font-semibold text-texto-suave";

const ETAPAS_SEM_LUCRO = ["reprovado", "devolvido_sem_reparo"];

function situacaoDoItem(item: ItemOrcamento, decidido: boolean): string {
  const partes = [item.tipo === "peca" ? "Peça" : "Serviço"];
  if (item.produto !== null) partes.push("do estoque");
  if (decidido) partes.push(item.aprovado ? "aprovado" : "recusado");
  if (item.custo_do_item !== null) partes.push(`custo ${emReais(item.custo_do_item)}`);
  return partes.join(" · ");
}

function LinhaDoItem({ ordem, item }: { ordem: Ordem; item: ItemOrcamento }) {
  const recusado = ordem.orcamento_aprovado && !item.aprovado;

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="min-w-0">
        <span className={juntar("block truncate text-sm font-medium", recusado && "text-texto-apagado")}>
          {item.descricao}
        </span>
        <span className="text-xs text-texto-apagado">
          {situacaoDoItem(item, ordem.orcamento_aprovado)}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <span
          className={juntar(
            "text-sm font-semibold text-dinheiro tabular-nums",
            recusado && "text-texto-apagado line-through",
          )}
        >
          {emReais(item.valor)}
        </span>

        {ordem.orcamento_editavel && (
          <form action={apagarItem}>
            <input type="hidden" name="id" value={ordem.id} />
            <input type="hidden" name="item" value={item.id} />
            <button
              type="submit"
              title="Remover item"
              className={botaoDeIcone}
            >
              <TrashIcon size={16} />
              <span className="sr-only">Remover {item.descricao}</span>
            </button>
          </form>
        )}
      </span>
    </li>
  );
}

type Campos = { produto: string; tipo: string; descricao: string; valor: string; custo: string };

const SEM_NADA: Campos = { produto: "", tipo: "peca", descricao: "", valor: "", custo: "" };

function DicaDaPeca({ produto, quantidade }: { produto: ProdutoParaEscolher; quantidade: number }) {
  if (quantidade <= 0) {
    return (
      <p className="text-[13px] text-texto-apagado sm:text-xs">
        Sem estoque nesta loja. Se o cliente aprovar, a peça fica faltando e aparece em Para repor.
      </p>
    );
  }
  return (
    <p className="text-[13px] text-texto-apagado sm:text-xs">
      Sai do estoque quando o cliente aprovar. Custo {emReais(produto.custo)}, {quantidade} nesta
      loja.
    </p>
  );
}

// Os campos são controlados para a peça escolhida preencher a descrição e o valor. Depois de uma
// recusa eles continuam com o que foi enviado, e depois de um envio que dá certo voltam a zero.
function NovoItem({ ordem, escolha }: { ordem: Ordem; escolha: EscolhaDeProdutos | null }) {
  const [estado, acao, adicionando] = useActionState(adicionarItem, INICIAL);
  const [campos, setCampos] = useState<Campos>(SEM_NADA);
  const [visto, setVisto] = useState(estado);
  const descricao = useRef<HTMLInputElement>(null);
  const seletorDoProduto = useOpcaoPadrao(campos.produto);
  const seletorDoTipo = useOpcaoPadrao(campos.tipo);

  if (estado !== visto) {
    setVisto(estado);
    if (estado.adicionado) setCampos(SEM_NADA);
  }

  useEffect(() => {
    if (estado.adicionado) descricao.current?.focus();
  }, [estado]);

  const produtos = escolha?.produtos ?? [];
  const variasLojas = escolha?.varias_lojas ?? false;
  const escolhido = produtos.find((produto) => String(produto.id) === campos.produto);
  const pecas = produtos.filter((produto) => produto.tipo === "peca");
  const acessorios = produtos.filter((produto) => produto.tipo === "acessorio");

  function mudar(mudanca: Partial<Campos>) {
    setCampos((atuais) => ({ ...atuais, ...mudanca }));
  }

  function escolherProduto(id: string) {
    const produto = produtos.find((outro) => String(outro.id) === id);
    if (!produto) {
      mudar({ produto: "", descricao: "", valor: "" });
      return;
    }
    mudar({
      produto: id,
      tipo: "peca",
      descricao: produto.nome,
      valor: reaisParaCampo(produto.preco),
      custo: "",
    });
  }

  function opcoes(lista: ProdutoParaEscolher[]) {
    return lista.map((produto) => (
      <option key={produto.id} value={produto.id}>
        {rotuloDoProduto(produto, quantidadeNaLoja(produto, ordem.loja, variasLojas))}
      </option>
    ));
  }

  return (
    <form action={acao} className="space-y-3 border-t border-borda p-5">
      <input type="hidden" name="id" value={ordem.id} />

      {produtos.length > 0 && (
        <label className="block space-y-1">
          <span className={ROTULO_DO_CAMPO}>Peça do estoque</span>
          <select
            ref={seletorDoProduto}
            name="produto"
            value={campos.produto}
            onChange={(evento) => escolherProduto(evento.target.value)}
            className={seletor}
          >
            <option value="">Nenhuma, vou digitar</option>
            {pecas.length > 0 && <optgroup label="Peças">{opcoes(pecas)}</optgroup>}
            {acessorios.length > 0 && <optgroup label="Acessórios">{opcoes(acessorios)}</optgroup>}
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className={ROTULO_DO_CAMPO}>Tipo</span>
          <select
            ref={seletorDoTipo}
            name="tipo"
            value={campos.tipo}
            disabled={Boolean(escolhido)}
            onChange={(evento) => mudar({ tipo: evento.target.value })}
            className={juntar(seletor, "w-auto")}
          >
            <option value="peca">Peça</option>
            <option value="servico">Serviço</option>
          </select>
        </label>
        <label className="min-w-0 flex-1 basis-48 space-y-1">
          <span className={ROTULO_DO_CAMPO}>
            Descrição
            <MarcaDeObrigatorio />
          </span>
          <input
            ref={descricao}
            name="descricao"
            placeholder="Ex.: Tela com moldura"
            required
            maxLength={180}
            value={campos.descricao}
            onChange={(evento) => mudar({ descricao: evento.target.value })}
            className={campo}
          />
        </label>
        <label className="w-32 space-y-1">
          <span className={ROTULO_DO_CAMPO}>
            Valor
            <MarcaDeObrigatorio />
          </span>
          <input
            name="valor"
            placeholder="R$ 0,00"
            inputMode="decimal"
            autoComplete="off"
            required
            value={campos.valor}
            onChange={(evento) => mudar({ valor: evento.target.value })}
            className={juntar(campo, "tabular-nums")}
          />
        </label>
        {!escolhido && (
          <label className="w-28 space-y-1">
            <span className={ROTULO_DO_CAMPO}>Custo</span>
            <input
              name="custo"
              placeholder="Opcional"
              inputMode="decimal"
              autoComplete="off"
              value={campos.custo}
              onChange={(evento) => mudar({ custo: evento.target.value })}
              className={juntar(campo, "tabular-nums")}
            />
          </label>
        )}
        <button type="submit" disabled={adicionando} className={botao("secundario")}>
          <PlusIcon size={16} />
          {adicionando ? "Adicionando..." : "Adicionar"}
        </button>
      </div>

      {escolhido && (
        <DicaDaPeca
          produto={escolhido}
          quantidade={quantidadeNaLoja(escolhido, ordem.loja, variasLojas)}
        />
      )}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}

function LucroDaOrdem({ ordem }: { ordem: Ordem }) {
  const entregue = ordem.valor_cobrado !== null;

  return (
    <div className="space-y-1.5 border-t border-borda px-5 py-3 text-[13px]">
      <dl className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-texto-apagado">Custo das peças</dt>
          <dd className="tabular-nums">{emReais(ordem.custo_dos_itens)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 font-semibold">
          <dt>{entregue ? "Lucro" : "Lucro previsto"}</dt>
          <dd className="text-dinheiro tabular-nums">{emReais(ordem.lucro)}</dd>
        </div>
      </dl>
      {ordem.pecas_sem_custo > 0 && (
        <p className="text-xs text-texto-apagado">
          Falta o custo de {contagem(ordem.pecas_sem_custo, "peça digitada", "peças digitadas")}, e
          o lucro real é menor que esse.
        </p>
      )}
    </div>
  );
}

type Props = { ordem: Ordem; escolha: EscolhaDeProdutos | null };

// O lucro aparece quando a equipe já anota custos nesta ordem: com a peça do estoque ou com o custo
// digitado no item. Sem nenhum custo, ele só repetiria o total.
function mostraOLucro(ordem: Ordem): boolean {
  if (ETAPAS_SEM_LUCRO.includes(ordem.status)) return false;
  const contam = ordem.itens.filter((item) => !ordem.orcamento_aprovado || item.aprovado);
  return contam.some((item) => item.custo_do_item !== null);
}

export function ItensDoOrcamento({ ordem, escolha }: Props) {
  const vazio = ordem.itens.length === 0;

  return (
    <>
      {vazio ? (
        <EstadoVazio
          icone={InvoiceIcon}
          titulo="Nenhum item ainda"
          descricao="Adicione as peças e os serviços do reparo, cada um com o seu valor."
        />
      ) : (
        <>
          <ul className="divide-y divide-borda">
            {ordem.itens.map((item) => (
              <LinhaDoItem key={item.id} ordem={ordem} item={item} />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-borda bg-realce px-5 py-3.5 text-sm font-bold">
            <span>{ordem.orcamento_aprovado ? "Total aprovado" : "Total"}</span>
            <span className="text-dinheiro tabular-nums">
              {emReais(ordem.orcamento_aprovado ? ordem.total_aprovado : ordem.total_orcamento)}
            </span>
          </div>
          {mostraOLucro(ordem) && <LucroDaOrdem ordem={ordem} />}
        </>
      )}

      {ordem.orcamento_editavel && <NovoItem ordem={ordem} escolha={escolha} />}
    </>
  );
}

export function OrcamentoDaOrdem({ ordem, escolha }: Props) {
  if (ordem.itens.length === 0 && !ordem.orcamento_editavel) {
    return (
      <EstadoVazio
        icone={ReceiptIcon}
        titulo="Sem orçamento"
        descricao="Esta ordem não teve peças nem serviços orçados."
      />
    );
  }

  return (
    <>
      {ordem.orcamento_editavel && (
        <p className="border-b border-borda px-5 py-3 text-[13px] text-texto-apagado">
          O cliente vê o orçamento quando você o envia. Depois disso, ele não muda mais.
        </p>
      )}
      <ItensDoOrcamento ordem={ordem} escolha={escolha} />
    </>
  );
}
