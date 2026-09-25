"use client";

import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";
import type { ItemOrcamento, Ordem } from "@/lib/tipos";
import { adicionarItem, apagarItem, type EstadoDoItem } from "./acoes";

const INICIAL: EstadoDoItem = {};

function situacaoDoItem(item: ItemOrcamento, decidido: boolean): string {
  const tipo = item.tipo === "peca" ? "Peça" : "Serviço";
  if (!decidido) return tipo;
  return `${tipo} · ${item.aprovado ? "aprovado" : "recusado"}`;
}

function LinhaDoItem({ ordem, item }: { ordem: Ordem; item: ItemOrcamento }) {
  const recusado = ordem.orcamento_aprovado && !item.aprovado;

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-2.5">
      <span className="min-w-0">
        <span className={juntar("block truncate text-sm", recusado && "text-texto-apagado")}>
          {item.descricao}
        </span>
        <span className="text-xs text-texto-suave">
          {situacaoDoItem(item, ordem.orcamento_aprovado)}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        <span
          className={juntar(
            "text-sm tabular-nums",
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
              className={juntar(botao("fantasma", "sm"), "px-2")}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              <span className="sr-only">Remover {item.descricao}</span>
            </button>
          </form>
        )}
      </span>
    </li>
  );
}

function NovoItem({ ordem }: { ordem: Ordem }) {
  const [estado, acao, adicionando] = useActionState(adicionarItem, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);
  const descricao = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!estado.adicionado) return;
    formulario.current?.reset();
    descricao.current?.focus();
  }, [estado]);

  return (
    <form ref={formulario} action={acao} className="space-y-3 border-t border-borda p-5">
      <input type="hidden" name="id" value={ordem.id} />

      <div className="flex flex-wrap gap-2">
        <select
          name="tipo"
          aria-label="Tipo do item"
          defaultValue="peca"
          className={juntar(seletor, "w-auto")}
        >
          <option value="peca">Peça</option>
          <option value="servico">Serviço</option>
        </select>
        <input
          ref={descricao}
          name="descricao"
          aria-label="Descrição"
          placeholder="Ex.: Tela com moldura"
          required
          maxLength={180}
          className={juntar(campo, "min-w-0 flex-1 basis-48")}
        />
        <input
          name="valor"
          aria-label="Valor em reais"
          placeholder="R$ 0,00"
          inputMode="decimal"
          autoComplete="off"
          required
          className={juntar(campo, "w-32 tabular-nums")}
        />
        <button type="submit" disabled={adicionando} className={botao("secundario")}>
          <Plus size={14} strokeWidth={2} />
          {adicionando ? "Adicionando..." : "Adicionar"}
        </button>
      </div>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}

export function OrcamentoDaOrdem({ ordem }: { ordem: Ordem }) {
  const vazio = ordem.itens.length === 0;
  if (vazio && !ordem.orcamento_editavel) return null;

  return (
    <Cartao
      tour="orcamento"
      titulo="Orçamento"
      descricao={
        ordem.orcamento_editavel
          ? "O cliente vê o orçamento quando você muda o status para Orçamento enviado. Depois disso, ele não muda mais."
          : undefined
      }
      semEspaco
    >
      {vazio ? (
        <EstadoVazio
          icone={<ReceiptText size={18} strokeWidth={1.75} />}
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
          <div className="flex items-center justify-between border-t border-borda bg-realce px-5 py-2.5 text-sm font-medium">
            <span>{ordem.orcamento_aprovado ? "Total aprovado" : "Total"}</span>
            <span className="tabular-nums">
              {emReais(ordem.orcamento_aprovado ? ordem.total_aprovado : ordem.total_orcamento)}
            </span>
          </div>
        </>
      )}

      {ordem.orcamento_editavel && <NovoItem ordem={ordem} />}
    </Cartao>
  );
}
