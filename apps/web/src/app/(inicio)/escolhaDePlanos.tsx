"use client";

import Link from "next/link";
import { useState } from "react";
import { botao, juntar } from "@/componentes/ui/estilos";
import { mensalNoAnual, precoDoPlano, tamanhoDoPlano, vagasDeFundador } from "@/lib/assinatura";
import { emReais } from "@/lib/moeda";
import type { Oferta, PlanoDaOferta } from "@/lib/oferta";
import type { Ciclo } from "@/lib/tipos";

const OPCAO_DO_CICLO =
  "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-texto-suave transition-colors has-checked:bg-superficie has-checked:text-texto has-checked:shadow-suave has-focus-visible:ring-2 has-focus-visible:ring-anel";

function CartaoDoPlano({
  plano,
  ciclo,
  fundador,
  diasDeTeste,
}: {
  plano: PlanoDaOferta;
  ciclo: Ciclo;
  fundador: boolean;
  diasDeTeste: number;
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-borda bg-superficie p-7 shadow-cartao">
      <p className="text-sm font-semibold text-texto-apagado">{plano.nome}</p>
      <p className="mt-1 text-[15px] text-texto-suave">{tamanhoDoPlano(plano)}</p>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold tracking-tight text-dinheiro tabular-nums">
          {emReais(precoDoPlano(plano, ciclo, fundador))}
        </span>
        <span className="text-base font-medium text-texto-apagado">
          {ciclo === "anual" ? "/ano" : "/mês"}
        </span>
      </p>
      <p className="mt-1 min-h-5 text-[13px] text-texto-apagado">
        {fundador && (
          <>
            <s className="tabular-nums">{emReais(precoDoPlano(plano, ciclo))}</s> depois das vagas
            de fundador
          </>
        )}
      </p>
      <p className="min-h-5 text-[13px] text-texto-apagado">
        {ciclo === "anual" && `ou ${emReais(mensalNoAnual(plano, fundador))} por mês`}
      </p>
      <Link href="/cadastro" className={juntar(botao("primario", "lg"), "mt-6 w-full")}>
        Testar grátis por {diasDeTeste} dias
      </Link>
    </div>
  );
}

export function EscolhaDePlanos({ oferta }: { oferta: Oferta }) {
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");
  const fundador = oferta.fundadores.restantes > 0;

  return (
    <div className="revelar mt-12">
      <div className="flex flex-col items-center gap-3">
        <fieldset>
          <legend className="sr-only">Pagamento</legend>
          <div className="inline-flex rounded-full border border-borda bg-realce p-1">
            <label className={OPCAO_DO_CICLO}>
              <input
                type="radio"
                name="ciclo-do-preco"
                value="mensal"
                checked={ciclo === "mensal"}
                onChange={() => setCiclo("mensal")}
                className="sr-only"
              />
              Mensal
            </label>
            <label className={OPCAO_DO_CICLO}>
              <input
                type="radio"
                name="ciclo-do-preco"
                value="anual"
                checked={ciclo === "anual"}
                onChange={() => setCiclo("anual")}
                className="sr-only"
              />
              Anual
              <span className="font-medium text-sucesso">2 meses grátis</span>
            </label>
          </div>
        </fieldset>
        {fundador && (
          <p className="text-center text-sm font-semibold text-texto">
            Preço de fundador, {oferta.fundadores.desconto}% a menos enquanto a assinatura
            continuar. {vagasDeFundador(oferta.fundadores)}.
          </p>
        )}
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-5 md:grid-cols-3">
        {oferta.planos.map((plano) => (
          <CartaoDoPlano
            key={plano.plano}
            plano={plano}
            ciclo={ciclo}
            fundador={fundador}
            diasDeTeste={oferta.dias_de_teste}
          />
        ))}
      </div>
    </div>
  );
}
