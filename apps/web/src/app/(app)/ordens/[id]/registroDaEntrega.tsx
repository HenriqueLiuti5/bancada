"use client";

import { useActionState, useRef, useState } from "react";
import { LinhaDePagamento, type LinhaPaga as Linha } from "@/componentes/LinhaDePagamento";
import { PlusIcon } from "@/componentes/icones";
import { MarcaDeObrigatorio } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import { centavosEmReais, centavosParaCampo, emCentavos } from "@/lib/moeda";
import { entregar, type EstadoDaEntrega } from "./acoes";

const INICIAL: EstadoDaEntrega = {};

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
    <div className="flex items-baseline justify-between gap-3 text-sm sm:text-[13px]">
      <dt className="text-texto-suave">{rotulo}</dt>
      <dd className="text-dinheiro tabular-nums">{valor}</dd>
    </div>
  );
}

export function RegistroDaEntrega({
  id,
  totalAprovado,
  hoje,
  aoCancelar,
}: {
  id: number;
  totalAprovado: string;
  hoje: string;
  aoCancelar: () => void;
}) {
  const [estado, acao, enviando] = useActionState(entregar, INICIAL);
  const aprovado = Math.round(Number(totalAprovado) * 100);
  const valorInicial = centavosParaCampo(aprovado);

  const [cobrado, setCobrado] = useState(valorInicial);
  const [linhas, setLinhas] = useState<Linha[]>(
    aprovado > 0 ? [{ chave: 0, forma: "pix", valor: valorInicial }] : [],
  );
  const [combinado, setCombinado] = useState("");
  const [nota, setNota] = useState("");
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

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold sm:text-[13px]">
          Valor cobrado
          <MarcaDeObrigatorio />
        </span>
        <input
          name="valor_cobrado"
          inputMode="decimal"
          autoComplete="off"
          value={cobrado}
          onChange={(evento) => mudarCobrado(evento.target.value)}
          className={juntar(campo, "tabular-nums")}
        />
        <span className="block text-[13px] text-texto-apagado sm:text-xs">
          Total aprovado:{" "}
          <span className="text-dinheiro tabular-nums">{centavosEmReais(aprovado)}</span>. Mude só se
          der desconto.
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-semibold sm:text-[13px]">Como o cliente pagou</legend>

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
          <p className="text-[13px] text-texto-suave sm:text-xs">
            Nada pago agora. O valor fica a receber e pode ser registrado depois, na própria ordem.
          </p>
        )}

        <button type="button" onClick={adicionarLinha} className={botao("fantasma", "sm")}>
          <PlusIcon size={16} />
          {linhas.length === 0 ? "Adicionar pagamento" : "Dividir em outra forma"}
        </button>
      </fieldset>

      <dl className="space-y-1 border-t border-borda pt-3">
        {desconto > 0 && <Resumo rotulo="Desconto" valor={centavosEmReais(desconto)} />}
        <Resumo rotulo="Pago agora" valor={centavosEmReais(pago)} />
        {aReceber > 0 && <Resumo rotulo="Fica a receber" valor={centavosEmReais(aReceber)} />}
      </dl>

      {aReceber > 0 && (
        <label className="block space-y-1.5">
          <span className="block text-sm font-semibold sm:text-[13px]">
            Quando o cliente vai pagar o resto?
            <MarcaDeObrigatorio />
          </span>
          <input
            type="date"
            name="pagamento_combinado_para"
            required
            min={hoje}
            value={combinado}
            onChange={(evento) => setCombinado(evento.target.value)}
            className={juntar(campo, "w-auto tabular-nums")}
          />
          <span className="block text-[13px] text-texto-apagado sm:text-xs">
            O dia combinado com o cliente. Ele sai no recibo.
          </span>
        </label>
      )}

      <input
        name="nota"
        aria-label="Observação"
        placeholder="Observação (opcional)"
        value={nota}
        onChange={(evento) => setNota(evento.target.value)}
        className={campo}
      />

      {problema && <Mensagem tipo="erro">{problema}</Mensagem>}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando || problema !== null}
          className={juntar(botao("primario"), "max-sm:w-full")}
        >
          {enviando ? "Registrando..." : "Confirmar entrega"}
        </button>
        <button type="button" onClick={aoCancelar} className={juntar(botao("fantasma"), "max-sm:w-full")}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
