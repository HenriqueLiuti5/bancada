"use client";

import { useRef } from "react";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { intervaloEscrito } from "@/lib/datas";
import type { Loja, PeriodoDoPainel } from "@/lib/tipos";

const PERIODOS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "7dias", rotulo: "7 dias" },
  { chave: "mes", rotulo: "Este mês" },
];

const ANTERIORES: Record<string, string> = {
  hoje: "ontem",
  "7dias": "os 7 dias anteriores",
};

function endereco(parametros: Record<string, string>): string {
  const consulta = new URLSearchParams(
    Object.entries(parametros).filter(([, valor]) => valor !== ""),
  );
  const texto = consulta.toString();
  return texto ? `/painel?${texto}` : "/painel";
}

function comparacaoEscrita(periodo: PeriodoDoPainel): string {
  const nome = ANTERIORES[periodo.chave];
  if (nome) return nome;
  return intervaloEscrito(periodo.anterior.inicio, periodo.anterior.fim);
}

export function FiltrosDoPainel({
  periodo,
  lojas,
  loja,
}: {
  periodo: PeriodoDoPainel;
  lojas: Loja[];
  loja: string;
}) {
  const formularioDaLoja = useRef<HTMLFormElement>(null);
  const personalizado = periodo.chave === "personalizado";
  const datas = personalizado ? { de: periodo.inicio, ate: periodo.fim } : { de: "", ate: "" };

  return (
    <div data-tour="periodo" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmentos>
          {PERIODOS.map((opcao) => (
            <Segmento
              key={opcao.chave}
              href={endereco({ periodo: opcao.chave, loja })}
              ativo={periodo.chave === opcao.chave}
            >
              {opcao.rotulo}
            </Segmento>
          ))}
          <Segmento
            href={endereco({
              periodo: "personalizado",
              de: periodo.inicio,
              ate: periodo.fim,
              loja,
            })}
            ativo={personalizado}
          >
            Escolher datas
          </Segmento>
        </Segmentos>

        {lojas.length > 1 && (
          <form ref={formularioDaLoja} action="/painel">
            <input type="hidden" name="periodo" value={periodo.chave} />
            {personalizado && <input type="hidden" name="de" value={datas.de} />}
            {personalizado && <input type="hidden" name="ate" value={datas.ate} />}
            <select
              name="loja"
              aria-label="Loja"
              defaultValue={loja}
              onChange={() => formularioDaLoja.current?.requestSubmit()}
              className={juntar(seletor, "w-auto")}
            >
              <option value="">Todas as lojas</option>
              {lojas.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.nome}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>

      {personalizado && (
        <form action="/painel" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="periodo" value="personalizado" />
          {loja && <input type="hidden" name="loja" value={loja} />}
          <label className="space-y-1">
            <span className="block text-xs text-texto-suave">De</span>
            <input
              type="date"
              name="de"
              defaultValue={datas.de}
              required
              className={juntar(campo, "w-auto")}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-texto-suave">Até</span>
            <input
              type="date"
              name="ate"
              defaultValue={datas.ate}
              required
              className={juntar(campo, "w-auto")}
            />
          </label>
          <button type="submit" className={botao("secundario")}>
            Aplicar
          </button>
        </form>
      )}

      <p className="text-[13px] text-texto-suave">
        {intervaloEscrito(periodo.inicio, periodo.fim)} · comparado com {comparacaoEscrita(periodo)}
      </p>
    </div>
  );
}
