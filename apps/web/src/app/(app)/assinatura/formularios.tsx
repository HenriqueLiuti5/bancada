"use client";

import { useActionState, useState } from "react";
import { AvisoDeObrigatorios, CampoRotulado, MarcaDeObrigatorio } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo } from "@/componentes/ui/estilos";
import { mensalNoAnual, porPeriodo, precoDoPlano, tamanhoDoPlano } from "@/lib/assinatura";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { emReais } from "@/lib/moeda";
import type { Ciclo, PlanoDaAssinatura } from "@/lib/tipos";
import { assinar, cancelarAssinatura } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

const OPCAO_DO_CICLO =
  "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-texto-suave transition-colors has-checked:bg-superficie has-checked:text-texto has-checked:shadow-suave has-focus-visible:ring-2 has-focus-visible:ring-anel sm:text-[13px]";

const CARTAO_DO_PLANO =
  "flex cursor-pointer flex-col gap-1 rounded-2xl border border-borda bg-superficie p-4 shadow-suave transition-[border-color,box-shadow] has-checked:border-anel has-checked:ring-4 has-checked:ring-anel/15 has-disabled:cursor-not-allowed has-disabled:bg-realce has-disabled:shadow-none";

const LEGENDA = "mb-2 text-sm font-semibold text-texto sm:text-[13px]";

function OpcaoDoPlano({
  plano,
  ciclo,
  marcado,
  aoEscolher,
}: {
  plano: PlanoDaAssinatura;
  ciclo: Ciclo;
  marcado: boolean;
  aoEscolher: (plano: string) => void;
}) {
  return (
    <label className={CARTAO_DO_PLANO}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-base font-bold">{plano.nome}</span>
        <input
          type="radio"
          name="plano"
          value={plano.plano}
          defaultChecked={marcado}
          disabled={plano.por_que_nao_cabe !== null}
          onChange={() => aoEscolher(plano.plano)}
          className="size-4 shrink-0 cursor-pointer accent-primario disabled:cursor-not-allowed"
        />
      </span>
      <span className="text-[13px] text-texto-suave">{tamanhoDoPlano(plano)}</span>
      <span className="mt-2 text-lg font-extrabold text-dinheiro tabular-nums">
        {emReais(precoDoPlano(plano, ciclo))}
      </span>
      <span className="text-[13px] text-texto-apagado">
        {ciclo === "anual"
          ? `por ano, ou ${emReais(mensalNoAnual(plano))} por mês`
          : "por mês"}
      </span>
      {plano.por_que_nao_cabe && (
        <span className="mt-1 text-[13px] text-texto-suave">{plano.por_que_nao_cabe}</span>
      )}
    </label>
  );
}

type PropsDaAssinatura = {
  documento: string;
  planos: PlanoDaAssinatura[];
  sugerido: string | null;
};

export function FormularioDeAssinatura({ documento, planos, sugerido }: PropsDaAssinatura) {
  const [estado, acao, enviando] = useActionState(assinar, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? { documento, plano: sugerido ?? "", ciclo: "mensal" };
  const [ciclo, setCiclo] = useState<Ciclo>(valores.ciclo === "anual" ? "anual" : "mensal");
  const [plano, setPlano] = useState(valores.plano);
  const escolhido = planos.find((opcao) => opcao.plano === plano && !opcao.por_que_nao_cabe);

  return (
    <form action={acao} className="space-y-5">
      <AvisoDeObrigatorios />

      {/* O React limpa o formulário depois de cada envio e só lê o defaultChecked quando a opção
          nasce: a chave recria as opções com o plano e o pagamento que foram enviados. */}
      <div key={`${valores.plano}-${valores.ciclo}`} className="space-y-5">
        <fieldset>
          <legend className={LEGENDA}>
            Pagamento
            <MarcaDeObrigatorio />
          </legend>
          <div className="inline-flex rounded-full border border-borda bg-realce p-1">
            <label className={OPCAO_DO_CICLO}>
              <input
                type="radio"
                name="ciclo"
                value="mensal"
                defaultChecked={valores.ciclo !== "anual"}
                onChange={() => setCiclo("mensal")}
                className="sr-only"
              />
              Mensal
            </label>
            <label className={OPCAO_DO_CICLO}>
              <input
                type="radio"
                name="ciclo"
                value="anual"
                defaultChecked={valores.ciclo === "anual"}
                onChange={() => setCiclo("anual")}
                className="sr-only"
              />
              Anual
              <span className="font-medium text-sucesso">2 meses grátis</span>
            </label>
          </div>
          {erros.ciclo && <p className="mt-1.5 text-[13px] text-perigo sm:text-xs">{erros.ciclo}</p>}
        </fieldset>

        <fieldset>
          <legend className={LEGENDA}>
            Plano
            <MarcaDeObrigatorio />
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {planos.map((opcao) => (
              <OpcaoDoPlano
                key={opcao.plano}
                plano={opcao}
                ciclo={ciclo}
                marcado={opcao.plano === valores.plano && !opcao.por_que_nao_cabe}
                aoEscolher={setPlano}
              />
            ))}
          </div>
          {erros.plano && <p className="mt-1.5 text-[13px] text-perigo sm:text-xs">{erros.plano}</p>}
        </fieldset>
      </div>

      <CampoRotulado
        rotulo="CPF ou CNPJ de quem paga"
        htmlFor="documento"
        erro={erros.documento}
        dica="Sai na fatura. Pode ser o CNPJ da assistência ou o seu CPF."
        className="max-w-sm"
        obrigatorio
      >
        <input
          id="documento"
          name="documento"
          required
          autoComplete="off"
          defaultValue={valores.documento}
          aria-describedby={erros.documento ? "documento-erro" : undefined}
          className={campo}
        />
      </CampoRotulado>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando || !escolhido} className={botao("primario")}>
          {enviando
            ? "Assinando..."
            : escolhido
              ? `Assinar o plano ${escolhido.nome} por ${emReais(precoDoPlano(escolhido, ciclo))} ${porPeriodo(ciclo)}`
              : "Assinar"}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}

export function CancelamentoDaAssinatura({ aviso }: { aviso: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao, enviando] = useActionState(cancelarAssinatura, INICIAL);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className={botao("fantasma", "sm")}>
        Cancelar assinatura
      </button>
    );
  }

  return (
    <form action={acao} className="w-full space-y-3 rounded-2xl border border-borda bg-realce p-4">
      <p className="text-[13px] text-texto">{aviso}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enviando} className={botao("perigo", "sm")}>
          {enviando ? "Cancelando..." : "Sim, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className={botao("fantasma", "sm")}
        >
          Voltar
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
