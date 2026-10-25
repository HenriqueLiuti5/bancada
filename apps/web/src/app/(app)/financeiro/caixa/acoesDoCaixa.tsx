"use client";

import { useActionState, useEffect, useState } from "react";
import { ListChecksIcon, PiggyBankIcon, TrayArrowDownIcon } from "@/componentes/icones";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import { resultadoDaConferencia } from "@/lib/caixa";
import type { EstadoDoFormulario } from "@/lib/formularios";
import type { ConferenciaDoCaixa } from "@/lib/tipos";
import { conferirGaveta, registrarMovimento, type EstadoDaConferencia } from "./acoes";

type Gaveta = "conferencia" | "retirada" | "reforco";

const INICIAL: EstadoDoFormulario = {};
const CONFERENCIA_INICIAL: EstadoDaConferencia = {};

// A equipe não vê quanto devia ter: o aviso dela só confirma que a contagem foi registrada.
function avisoDaConferencia(conferencia: ConferenciaDoCaixa, dono: boolean): string {
  if (!dono) return "Conferência registrada. O dono vê se bateu.";
  return `Conferência registrada. ${resultadoDaConferencia(conferencia.diferenca).texto}.`;
}

function Botoes({
  enviando,
  rotulo,
  aoCancelar,
}: {
  enviando: boolean;
  rotulo: string;
  aoCancelar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={enviando} className={juntar(botao("primario"), "max-sm:w-full")}>
        {enviando ? "Registrando..." : rotulo}
      </button>
      <button type="button" onClick={aoCancelar} className={juntar(botao("fantasma"), "max-sm:w-full")}>
        Cancelar
      </button>
    </div>
  );
}

function FormularioDaConferencia({
  loja,
  dono,
  aoConcluir,
  aoCancelar,
}: {
  loja: number;
  dono: boolean;
  aoConcluir: (aviso: string) => void;
  aoCancelar: () => void;
}) {
  const [estado, acao, enviando] = useActionState(conferirGaveta, CONFERENCIA_INICIAL);
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};

  useEffect(() => {
    if (estado.conferencia) aoConcluir(avisoDaConferencia(estado.conferencia, dono));
  }, [estado, aoConcluir, dono]);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="loja" value={loja} />
      <AvisoDeObrigatorios />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado
          rotulo="Quanto tem na gaveta?"
          htmlFor="caixa-contado"
          erro={erros.contado}
          obrigatorio
          dica="Conte as notas e as moedas."
        >
          <input
            id="caixa-contado"
            name="contado"
            inputMode="decimal"
            autoComplete="off"
            required
            autoFocus
            defaultValue={valores.contado}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
        <CampoRotulado
          rotulo="Vai tirar uma parte agora?"
          htmlFor="caixa-retirado"
          erro={erros.retirado}
          dica="Para o cofre ou o banco. O resto fica de troco para amanhã."
        >
          <input
            id="caixa-retirado"
            name="retirado"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={valores.retirado}
            placeholder="0,00"
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
      </div>
      <CampoRotulado rotulo="Observação" htmlFor="caixa-observacao" erro={erros.observacao}>
        <input
          id="caixa-observacao"
          name="observacao"
          maxLength={200}
          defaultValue={valores.observacao}
          className={campo}
        />
      </CampoRotulado>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      <Botoes enviando={enviando} rotulo="Registrar a conferência" aoCancelar={aoCancelar} />
    </form>
  );
}

function FormularioDoMovimento({
  loja,
  tipo,
  aoConcluir,
  aoCancelar,
}: {
  loja: number;
  tipo: "retirada" | "reforco";
  aoConcluir: (aviso: string) => void;
  aoCancelar: () => void;
}) {
  const [estado, acao, enviando] = useActionState(registrarMovimento, INICIAL);
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};
  const retirada = tipo === "retirada";

  useEffect(() => {
    if (estado.ok) aoConcluir(estado.ok);
  }, [estado, aoConcluir]);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="loja" value={loja} />
      <input type="hidden" name="tipo" value={tipo} />
      <AvisoDeObrigatorios />
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <CampoRotulado
          rotulo={retirada ? "Quanto saiu da gaveta" : "Quanto entrou na gaveta"}
          htmlFor={`caixa-${tipo}-valor`}
          erro={erros.valor}
          obrigatorio
        >
          <input
            id={`caixa-${tipo}-valor`}
            name="valor"
            inputMode="decimal"
            autoComplete="off"
            required
            autoFocus
            defaultValue={valores.valor}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="Motivo" htmlFor={`caixa-${tipo}-motivo`} erro={erros.motivo}>
          <input
            id={`caixa-${tipo}-motivo`}
            name="motivo"
            maxLength={120}
            defaultValue={valores.motivo}
            placeholder={retirada ? "Ex.: depósito no banco" : "Ex.: troco trazido do banco"}
            className={campo}
          />
        </CampoRotulado>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      <Botoes
        enviando={enviando}
        rotulo={retirada ? "Registrar a retirada" : "Registrar o reforço"}
        aoCancelar={aoCancelar}
      />
    </form>
  );
}

export function AcoesDoCaixa({ loja, dono }: { loja: number; dono: boolean }) {
  const [aberta, setAberta] = useState<Gaveta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fechar = () => setAberta(null);
  const concluir = (texto: string) => {
    setAviso(texto);
    setAberta(null);
  };
  const abrir = (gaveta: Gaveta) => {
    setAviso(null);
    setAberta(gaveta);
  };

  return (
    <section
      data-tour="acoes-do-caixa"
      className="space-y-4 rounded-2xl border border-borda bg-superficie p-5 shadow-cartao sm:p-6"
    >
      {aviso && <Mensagem tipo="sucesso">{aviso}</Mensagem>}

      {aberta === "conferencia" && (
        <FormularioDaConferencia loja={loja} dono={dono} aoConcluir={concluir} aoCancelar={fechar} />
      )}
      {(aberta === "retirada" || aberta === "reforco") && (
        <FormularioDoMovimento
          key={aberta}
          loja={loja}
          tipo={aberta}
          aoConcluir={concluir}
          aoCancelar={fechar}
        />
      )}

      {aberta === null && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => abrir("conferencia")}
            className={juntar(botao("primario"), "max-sm:w-full")}
          >
            <ListChecksIcon size={18} />
            Conferir a gaveta
          </button>
          <button
            type="button"
            onClick={() => abrir("retirada")}
            className={juntar(botao("secundario"), "max-sm:w-full")}
          >
            <PiggyBankIcon size={18} />
            Retirada
          </button>
          <button
            type="button"
            onClick={() => abrir("reforco")}
            className={juntar(botao("secundario"), "max-sm:w-full")}
          >
            <TrayArrowDownIcon size={18} />
            Reforço
          </button>
        </div>
      )}
    </section>
  );
}
