"use client";

import { useActionState, useState } from "react";
import { EyeIcon, PencilSimpleIcon, ShieldCheckIcon } from "@/componentes/icones";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import {
  corrigirSenhaDoAparelho,
  verSenhaDoAparelho,
  type EstadoDaCorrecaoDaSenha,
  type EstadoDaSenha,
} from "./acoes";

const INICIAL: EstadoDaSenha = {};
const INICIAL_DA_CORRECAO: EstadoDaCorrecaoDaSenha = {};

function CorrecaoDaSenha({
  aparelho,
  senha,
  aoCorrigir,
  aoCancelar,
}: {
  aparelho: number;
  senha: string;
  aoCorrigir: (senha: string) => void;
  aoCancelar: () => void;
}) {
  const [estado, acao, salvando] = useActionState(
    async (anterior: EstadoDaCorrecaoDaSenha, dados: FormData) => {
      const resultado = await corrigirSenhaDoAparelho(anterior, dados);
      if (resultado.senha !== undefined) aoCorrigir(resultado.senha);
      return resultado;
    },
    INICIAL_DA_CORRECAO,
  );

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="aparelho" value={aparelho} />
      <input
        name="senha_desbloqueio"
        aria-label="Senha de desbloqueio correta"
        defaultValue={senha}
        autoComplete="off"
        autoFocus
        className={juntar(campo, "font-mono tracking-wider")}
      />
      <p className="text-[13px] text-texto-apagado sm:text-xs">
        Se for desenho, anote a sequência, por exemplo 1-2-3-6-9. A troca fica registrada na
        auditoria.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={salvando} className={botao("primario", "sm")}>
          {salvando ? "Salvando..." : "Salvar senha"}
        </button>
        <button type="button" onClick={aoCancelar} className={botao("fantasma", "sm")}>
          Cancelar
        </button>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}

function SenhaRevelada({
  aparelho,
  revelada,
  podeCorrigir,
}: {
  aparelho: number;
  revelada: string;
  podeCorrigir: boolean;
}) {
  const [senha, setSenha] = useState(revelada);
  const [corrigindo, setCorrigindo] = useState(false);
  const [corrigida, setCorrigida] = useState(false);

  if (corrigindo) {
    return (
      <CorrecaoDaSenha
        aparelho={aparelho}
        senha={senha}
        aoCorrigir={(nova) => {
          setSenha(nova);
          setCorrigida(true);
          setCorrigindo(false);
        }}
        aoCancelar={() => setCorrigindo(false)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="rounded-xl bg-realce px-3.5 py-2.5 font-mono text-base tracking-wider">
        {senha || "Nenhuma senha cadastrada"}
      </p>
      <p className="flex items-start gap-1.5 text-[13px] text-texto-suave sm:text-xs">
        <ShieldCheckIcon size={14} className="mt-px shrink-0 text-sucesso" />
        {corrigida
          ? "Senha corrigida. A troca ficou registrada na auditoria, com seu usuário e o horário."
          : "Esta consulta ficou registrada na auditoria, com seu usuário e o horário."}
      </p>
      {podeCorrigir && (
        <button
          type="button"
          onClick={() => setCorrigindo(true)}
          className={botao("fantasma", "sm")}
        >
          <PencilSimpleIcon size={14} />
          {senha ? "Corrigir senha" : "Cadastrar senha"}
        </button>
      )}
    </div>
  );
}

export function SenhaDoAparelho({
  aparelho,
  podeCorrigir,
}: {
  aparelho: number;
  podeCorrigir: boolean;
}) {
  const [estado, acao, consultando] = useActionState(verSenhaDoAparelho, INICIAL);

  if (estado.revelada) {
    return (
      <SenhaRevelada aparelho={aparelho} revelada={estado.senha ?? ""} podeCorrigir={podeCorrigir} />
    );
  }

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="aparelho" value={aparelho} />
      <button type="submit" disabled={consultando} className={juntar(botao("secundario", "sm"), "w-full")}>
        <EyeIcon size={16} />
        {consultando ? "Consultando..." : "Revelar senha"}
      </button>
      <p className="text-[13px] text-texto-apagado sm:text-xs">Cada consulta fica registrada na auditoria.</p>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
