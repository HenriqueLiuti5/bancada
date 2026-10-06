"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircleIcon, TrashIcon, WalletIcon } from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { FUSO_HORARIO } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import { FORMAS_DE_PAGAMENTO } from "@/lib/pagamentos";
import type { Ordem, Pagamento } from "@/lib/tipos";
import { receberPagamento, removerPagamento, type EstadoDoRecebimento } from "./acoes";

const INICIAL: EstadoDoRecebimento = {};

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: FUSO_HORARIO,
  });
}

function Linha({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{rotulo}</span>
        {detalhe && <span className="text-xs text-texto-apagado">{detalhe}</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{valor}</span>
    </li>
  );
}

function LinhaDoPagamento({
  ordem,
  pagamento,
  podeRemover,
}: {
  ordem: number;
  pagamento: Pagamento;
  podeRemover: boolean;
}) {
  const detalhe = [dataCurta(pagamento.recebido_em), pagamento.registrado_por]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{pagamento.forma_rotulo}</span>
        <span className="text-xs text-texto-apagado">{detalhe}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="text-sm font-semibold tabular-nums">{emReais(pagamento.valor)}</span>
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

function NovoRecebimento({ ordem }: { ordem: Ordem }) {
  const [estado, acao, enviando] = useActionState(receberPagamento, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);
  const saldo = Number(ordem.saldo_a_receber).toFixed(2).replace(".", ",");

  useEffect(() => {
    if (estado.registrado) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={acao} className="space-y-3 border-t border-borda p-5">
      <input type="hidden" name="id" value={ordem.id} />
      <p className="text-[13px] text-texto-apagado">
        Quando o cliente pagar o que falta, registre aqui.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          name="forma"
          aria-label="Forma de pagamento"
          defaultValue="pix"
          className={juntar(seletor, "w-auto")}
        >
          {FORMAS_DE_PAGAMENTO.map((forma) => (
            <option key={forma.valor} value={forma.valor}>
              {forma.rotulo}
            </option>
          ))}
        </select>
        <input
          key={saldo}
          name="valor"
          aria-label="Valor pago"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={saldo}
          className={juntar(campo, "w-32 tabular-nums")}
        />
        <button type="submit" disabled={enviando} className={botao("secundario")}>
          {enviando ? "Registrando..." : "Registrar pagamento"}
        </button>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}

export function PagamentoDaOrdem({ ordem, podeRemover }: { ordem: Ordem; podeRemover: boolean }) {
  if (ordem.valor_cobrado === null) return null;

  const temDesconto = Number(ordem.desconto) > 0;
  const saldo = Number(ordem.saldo_a_receber);

  return (
    <Cartao tour="pagamento" titulo="Pagamento" icone={WalletIcon} semEspaco>
      <ul className="divide-y divide-borda">
        {temDesconto && (
          <>
            <Linha rotulo="Total aprovado" valor={emReais(ordem.total_aprovado)} />
            <Linha rotulo="Desconto" valor={`-${emReais(ordem.desconto)}`} />
          </>
        )}
        <Linha rotulo="Valor cobrado" valor={emReais(ordem.valor_cobrado)} />
        {ordem.pagamentos.map((pagamento) => (
          <LinhaDoPagamento
            key={pagamento.id}
            ordem={ordem.id}
            pagamento={pagamento}
            podeRemover={podeRemover}
          />
        ))}
      </ul>

      <div className="space-y-1 border-t border-borda bg-realce px-5 py-3.5 text-sm">
        <div className="flex items-center justify-between font-bold">
          <span>Total pago</span>
          <span className="tabular-nums">{emReais(ordem.total_pago)}</span>
        </div>
        {saldo > 0 ? (
          <div className="flex items-center justify-between font-bold">
            <span>Falta receber</span>
            <span className="tabular-nums">{emReais(ordem.saldo_a_receber)}</span>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-sucesso">
            <CheckCircleIcon size={16} />
            {Number(ordem.valor_cobrado) === 0 ? "Sem custo para o cliente" : "Quitado"}
          </p>
        )}
      </div>

      {saldo > 0 && <NovoRecebimento ordem={ordem} />}
    </Cartao>
  );
}
