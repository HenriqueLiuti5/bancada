"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { centavosEmReais, centavosParaCampo, emCentavos } from "@/lib/moeda";
import { FORMAS_DE_PAGAMENTO } from "@/lib/pagamentos";
import { entregar, type EstadoDaEntrega } from "./acoes";

const INICIAL: EstadoDaEntrega = {};

type Linha = { chave: number; forma: string; valor: string };

function linhaSemValor(linha: Linha): boolean {
  const centavos = emCentavos(linha.valor);
  return centavos === null || centavos === 0;
}

function problemaDosValores(
  cobrado: number | null,
  aprovado: number,
  linhas: Linha[],
  pago: number,
): string | null {
  if (cobrado === null) return "Escreva o valor cobrado só com números, como 150,00.";
  if (cobrado > aprovado) return "O valor cobrado não pode passar do total aprovado.";
  if (linhas.some(linhaSemValor)) {
    return "Preencha o valor de cada forma de pagamento, ou tire a que sobrou.";
  }
  if (pago > cobrado) {
    return `Os pagamentos passam do valor cobrado em ${centavosEmReais(pago - cobrado)}.`;
  }
  return null;
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <dt className="text-texto-suave">{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}

function LinhaDePagamento({
  linha,
  aoMudar,
  aoRemover,
}: {
  linha: Linha;
  aoMudar: (mudanca: Partial<Linha>) => void;
  aoRemover: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        name="forma"
        aria-label="Forma de pagamento"
        value={linha.forma}
        onChange={(evento) => aoMudar({ forma: evento.target.value })}
        className={juntar(seletor, "w-28 shrink-0")}
      >
        {FORMAS_DE_PAGAMENTO.map((forma) => (
          <option key={forma.valor} value={forma.valor}>
            {forma.rotulo}
          </option>
        ))}
      </select>
      <input
        name="valor_pago"
        aria-label="Valor pago nessa forma"
        inputMode="decimal"
        autoComplete="off"
        value={linha.valor}
        onChange={(evento) => aoMudar({ valor: evento.target.value })}
        className={juntar(campo, "min-w-0 flex-1 tabular-nums")}
      />
      <button
        type="button"
        onClick={aoRemover}
        title="Tirar esta forma"
        className={juntar(botao("fantasma", "sm"), "shrink-0 px-2")}
      >
        <X size={14} strokeWidth={2} />
        <span className="sr-only">Tirar esta forma de pagamento</span>
      </button>
    </div>
  );
}

export function RegistroDaEntrega({ id, totalAprovado }: { id: number; totalAprovado: string }) {
  const [estado, acao, enviando] = useActionState(entregar, INICIAL);
  const aprovado = Math.round(Number(totalAprovado) * 100);
  const valorInicial = centavosParaCampo(aprovado);

  const [cobrado, setCobrado] = useState(valorInicial);
  const [linhas, setLinhas] = useState<Linha[]>(
    aprovado > 0 ? [{ chave: 0, forma: "pix", valor: valorInicial }] : [],
  );
  const proximaChave = useRef(1);

  const cobradoEmCentavos = emCentavos(cobrado);
  const pago = linhas.reduce((soma, linha) => soma + (emCentavos(linha.valor) ?? 0), 0);
  const problema = problemaDosValores(cobradoEmCentavos, aprovado, linhas, pago);
  const desconto = cobradoEmCentavos === null ? 0 : aprovado - cobradoEmCentavos;
  const aReceber = cobradoEmCentavos === null ? 0 : cobradoEmCentavos - pago;

  function mudarCobrado(novo: string) {
    setLinhas((atuais) =>
      atuais.length === 1 && atuais[0].valor === cobrado ? [{ ...atuais[0], valor: novo }] : atuais,
    );
    setCobrado(novo);
  }

  function mudarLinha(chave: number, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)),
    );
  }

  function adicionarLinha() {
    const restante = Math.max((cobradoEmCentavos ?? 0) - pago, 0);
    const chave = proximaChave.current;
    proximaChave.current += 1;
    setLinhas((atuais) => [
      ...atuais,
      { chave, forma: "dinheiro", valor: restante > 0 ? centavosParaCampo(restante) : "" },
    ]);
  }

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <p className="text-[13px] text-texto-suave">
        Para entregar, registre quanto foi cobrado e como o cliente pagou.
      </p>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium">Valor cobrado</span>
        <input
          name="valor_cobrado"
          inputMode="decimal"
          autoComplete="off"
          value={cobrado}
          onChange={(evento) => mudarCobrado(evento.target.value)}
          className={juntar(campo, "tabular-nums")}
        />
        <span className="block text-xs text-texto-apagado">
          Total aprovado: {centavosEmReais(aprovado)}. Mude só se der desconto.
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-[13px] font-medium">Como o cliente pagou</legend>

        {linhas.map((linha) => (
          <LinhaDePagamento
            key={linha.chave}
            linha={linha}
            aoMudar={(mudanca) => mudarLinha(linha.chave, mudanca)}
            aoRemover={() =>
              setLinhas((atuais) => atuais.filter((outra) => outra.chave !== linha.chave))
            }
          />
        ))}

        {linhas.length === 0 && (
          <p className="text-xs text-texto-suave">
            Nada pago agora. O valor fica a receber e pode ser registrado depois, na própria ordem.
          </p>
        )}

        <button type="button" onClick={adicionarLinha} className={botao("fantasma", "sm")}>
          <Plus size={14} strokeWidth={2} />
          {linhas.length === 0 ? "Adicionar pagamento" : "Dividir em outra forma"}
        </button>
      </fieldset>

      <dl className="space-y-1 border-t border-borda pt-3">
        {desconto > 0 && <Resumo rotulo="Desconto" valor={centavosEmReais(desconto)} />}
        <Resumo rotulo="Pago agora" valor={centavosEmReais(pago)} />
        {aReceber > 0 && <Resumo rotulo="Fica a receber" valor={centavosEmReais(aReceber)} />}
      </dl>

      <input
        name="nota"
        aria-label="Observação"
        placeholder="Observação (opcional)"
        className={campo}
      />

      {problema && <Mensagem tipo="erro">{problema}</Mensagem>}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <button
        type="submit"
        disabled={enviando || problema !== null}
        className={juntar(botao("primario"), "w-full")}
      >
        {enviando ? "Registrando..." : "Confirmar entrega"}
      </button>
    </form>
  );
}
