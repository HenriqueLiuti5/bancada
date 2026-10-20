"use client";

import { useActionState } from "react";
import { CheckCircleIcon, TrashIcon, WalletIcon } from "@/componentes/icones";
import { MarcaDeObrigatorio } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { dataDoMomento } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import { FORMAS_DE_PAGAMENTO } from "@/lib/pagamentos";
import type { Ordem, Pagamento } from "@/lib/tipos";
import { receberPagamento, removerPagamento, type EstadoDoRecebimento } from "./acoes";

const INICIAL: EstadoDoRecebimento = {};

function Linha({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{rotulo}</span>
        {detalhe && <span className="text-xs text-texto-apagado">{detalhe}</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold text-dinheiro tabular-nums">{valor}</span>
    </li>
  );
}

function LinhaDoPagamento({
  ordem,
  pagamento,
  podeRemover,
  fuso,
}: {
  ordem: number;
  pagamento: Pagamento;
  podeRemover: boolean;
  fuso: string;
}) {
  const detalhe = [dataDoMomento(pagamento.recebido_em, fuso), pagamento.registrado_por]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{pagamento.forma_rotulo}</span>
        <span className="text-xs text-texto-apagado">{detalhe}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="text-sm font-semibold text-dinheiro tabular-nums">
          {emReais(pagamento.valor)}
        </span>
        {podeRemover && (
          <form action={removerPagamento}>
            <input type="hidden" name="id" value={ordem} />
            <input type="hidden" name="pagamento" value={pagamento.id} />
            <button
              type="submit"
              title="Remover pagamento lançado errado"
              className={botaoDeIcone}
            >
              <TrashIcon size={16} />
              <span className="sr-only">Remover pagamento de {emReais(pagamento.valor)}</span>
            </button>
          </form>
        )}
      </span>
    </li>
  );
}

export function NovoRecebimento({
  id,
  saldo,
  aoCancelar,
}: {
  id: number;
  saldo: string;
  aoCancelar: () => void;
}) {
  const [estado, acao, enviando] = useActionState(receberPagamento, INICIAL);
  const valores = estado.valores ?? {};

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-texto-suave">Forma</span>
          {/* O React limpa o formulário depois de cada envio e só lê o defaultValue de um select
              quando ele nasce: a chave o recria com a forma que foi enviada. */}
          <select
            key={valores.forma}
            name="forma"
            defaultValue={valores.forma ?? "pix"}
            className={juntar(seletor, "w-auto")}
          >
            {FORMAS_DE_PAGAMENTO.map((forma) => (
              <option key={forma.valor} value={forma.valor}>
                {forma.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="w-32 space-y-1">
          <span className="block text-xs font-semibold text-texto-suave">
            Valor pago
            <MarcaDeObrigatorio />
          </span>
          <input
            name="valor"
            inputMode="decimal"
            autoComplete="off"
            required
            autoFocus
            defaultValue={valores.valor ?? Number(saldo).toFixed(2).replace(".", ",")}
            className={juntar(campo, "tabular-nums")}
          />
        </label>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className={juntar(botao("primario"), "max-sm:w-full")}>
          {enviando ? "Registrando..." : "Registrar pagamento"}
        </button>
        <button type="button" onClick={aoCancelar} className={juntar(botao("fantasma"), "max-sm:w-full")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

type Props = { ordem: Ordem; podeRemover: boolean; fuso: string };

export function PagamentoDaOrdem({ ordem, podeRemover, fuso }: Props) {
  if (ordem.valor_cobrado === null) return null;

  const temDesconto = Number(ordem.desconto) > 0;
  const saldo = Number(ordem.saldo_a_receber);

  return (
    <section className="border-t border-borda">
      <h3 className="flex items-center gap-2 px-5 pt-4 pb-1 text-sm font-semibold">
        <WalletIcon size={18} className="text-icone" />
        Pagamento
      </h3>
      <ul className="divide-y divide-borda">
        {temDesconto && (
          <>
            <Linha rotulo="Total aprovado" valor={emReais(ordem.total_aprovado)} />
            <Linha rotulo="Desconto" valor={`−${emReais(ordem.desconto)}`} />
          </>
        )}
        <Linha rotulo="Valor cobrado" valor={emReais(ordem.valor_cobrado)} />
        {ordem.pagamentos.map((pagamento) => (
          <LinhaDoPagamento
            key={pagamento.id}
            ordem={ordem.id}
            pagamento={pagamento}
            podeRemover={podeRemover}
            fuso={fuso}
          />
        ))}
      </ul>

      <div className="space-y-1 border-t border-borda bg-realce px-5 py-3.5 text-sm">
        <div className="flex items-center justify-between font-bold">
          <span>Total pago</span>
          <span className="text-dinheiro tabular-nums">{emReais(ordem.total_pago)}</span>
        </div>
        {saldo > 0 ? (
          <div className="flex items-center justify-between font-bold">
            <span>Falta receber</span>
            <span className="text-dinheiro tabular-nums">{emReais(ordem.saldo_a_receber)}</span>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-sucesso">
            <CheckCircleIcon size={16} />
            {Number(ordem.valor_cobrado) === 0 ? "Sem custo para o cliente" : "Quitado"}
          </p>
        )}
      </div>
    </section>
  );
}
