"use client";

import { useActionState, useState } from "react";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, caixaDeMarcar, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { useMarcacaoPadrao } from "@/componentes/useOpcaoPadrao";
import { FORMAS_DE_PAGAMENTO_DAS_CONTAS } from "@/lib/financeiro";
import type { EstadoDoFormulario } from "@/lib/formularios";
import type { Loja } from "@/lib/tipos";
import { lancarConta, lancarContaPelaEquipe } from "./acoes";
import { CamposDaConta } from "./camposDaConta";

const INICIAL: EstadoDoFormulario = {};

type Props = { lojas: Loja[]; fornecedores: string[]; hoje: string; eDono: boolean };

// As caixas de marcar são controladas para continuar como foram enviadas quando a API recusa. Quando
// a conta é lançada pela equipe, o formulário fica na tela e volta ao começo para a próxima.
export function NovaConta({ lojas, fornecedores, hoje, eDono }: Props) {
  const [estado, acao, enviando] = useActionState(
    eDono ? lancarConta : lancarContaPelaEquipe,
    INICIAL,
  );
  const [paga, setPaga] = useState(false);
  const [repetir, setRepetir] = useState(false);
  const [visto, setVisto] = useState(estado);
  const caixaDaPaga = useMarcacaoPadrao(paga);
  const caixaDoRepetir = useMarcacaoPadrao(repetir);
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};

  if (estado !== visto) {
    setVisto(estado);
    if (estado.ok) {
      setPaga(false);
      setRepetir(false);
    }
  }

  return (
    <form action={acao} className="space-y-6">
      <AvisoDeObrigatorios />
      <CamposDaConta
        prefixo="nova-conta"
        valores={valores}
        erros={erros}
        lojas={lojas}
        fornecedores={fornecedores}
        hoje={hoje}
      />

      <div className="space-y-4 border-t border-borda pt-5">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input
            ref={caixaDaPaga}
            type="checkbox"
            name="paga"
            value="sim"
            checked={paga}
            onChange={(evento) => setPaga(evento.target.checked)}
            className={caixaDeMarcar}
          />
          Já está paga
        </label>

        {paga && (
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoRotulado rotulo="Paga em" htmlFor="nova-conta-paga-em" erro={erros.paga_em}>
              <input
                id="nova-conta-paga-em"
                type="date"
                name="paga_em"
                max={hoje}
                defaultValue={valores.paga_em || hoje}
                className={campo}
              />
            </CampoRotulado>
            <CampoRotulado
              rotulo="Como foi paga"
              htmlFor="nova-conta-forma"
              erro={erros.forma}
              obrigatorio
            >
              <select
                key={valores.forma}
                id="nova-conta-forma"
                name="forma"
                defaultValue={valores.forma || "pix"}
                className={seletor}
              >
                {FORMAS_DE_PAGAMENTO_DAS_CONTAS.map((forma) => (
                  <option key={forma.valor} value={forma.valor}>
                    {forma.rotulo}
                  </option>
                ))}
              </select>
            </CampoRotulado>
          </div>
        )}

        {eDono && (
          <label className="flex items-start gap-2.5 text-sm">
            <input
              ref={caixaDoRepetir}
              type="checkbox"
              name="repetir"
              value="sim"
              checked={repetir}
              onChange={(evento) => setRepetir(evento.target.checked)}
              className={juntar(caixaDeMarcar, "mt-0.5")}
            />
            <span>
              <span className="font-medium">Repetir todo mês</span>
              <span className="block text-[13px] text-texto-apagado sm:text-xs">
                Uma conta igual aparece sozinha todo mês, no mesmo dia, um mês antes de vencer.
              </span>
            </span>
          </label>
        )}
        {erros.repetir && <Mensagem tipo="erro">{erros.repetir}</Mensagem>}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          {enviando ? "Lançando..." : "Lançar conta"}
        </button>
        {estado.ok && <Mensagem tipo="sucesso">{estado.ok}</Mensagem>}
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
