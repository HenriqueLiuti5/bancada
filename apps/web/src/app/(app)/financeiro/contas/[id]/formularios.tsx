"use client";

import { useActionState, useState } from "react";
import { ArrowUUpLeftIcon, ProhibitIcon, TrashIcon, type Icon } from "@/componentes/icones";
import { AvisoDeObrigatorios, CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { RodapeDoFormulario } from "@/componentes/ui/RodapeDoFormulario";
import { botao, caixaDeMarcar, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { FORMAS_DE_PAGAMENTO_DAS_CONTAS } from "@/lib/financeiro";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { reaisParaCampo } from "@/lib/moeda";
import type { ContaAPagar, Loja } from "@/lib/tipos";
import {
  desfazerPagamento,
  pagarConta,
  pararDeRepetir,
  removerConta,
  salvarConta,
  type EstadoSimples,
} from "../../acoes";
import { CamposDaConta } from "../../camposDaConta";

const INICIAL: EstadoDoFormulario = {};
const INICIAL_SIMPLES: EstadoSimples = {};

type PropsDosDados = { conta: ContaAPagar; lojas: Loja[]; fornecedores: string[]; hoje: string };

export function DadosDaConta({ conta, lojas, fornecedores, hoje }: PropsDosDados) {
  const [estado, acao, enviando] = useActionState(salvarConta, INICIAL);
  const valores = estado.valores ?? {
    descricao: conta.descricao,
    categoria: conta.categoria,
    valor: reaisParaCampo(conta.valor),
    vencimento: conta.vencimento,
    fornecedor: conta.fornecedor,
    loja: conta.loja === null ? "" : String(conta.loja),
    observacao: conta.observacao,
  };

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={conta.id} />
      <CamposDaConta
        prefixo="conta"
        valores={valores}
        erros={estado.erros ?? {}}
        lojas={lojas}
        fornecedores={fornecedores}
        hoje={hoje}
        estreito
      />
      {conta.repete && (
        <label className="flex items-start gap-2.5 text-sm">
          <input
            key={valores.tambem_nas_proximas}
            type="checkbox"
            name="tambem_nas_proximas"
            value="sim"
            defaultChecked={valores.tambem_nas_proximas === "sim"}
            className={juntar(caixaDeMarcar, "mt-0.5")}
          />
          <span>
            <span className="font-medium">Mudar também as próximas</span>
            <span className="block text-[13px] text-texto-apagado sm:text-xs">
              As contas dos meses seguintes ficam com este valor, esta categoria e este dia de
              vencimento.
            </span>
          </span>
        </label>
      )}
      <RodapeDoFormulario estado={estado} enviando={enviando} />
    </form>
  );
}

export function PagamentoDaConta({ conta, hoje }: { conta: ContaAPagar; hoje: string }) {
  const [estado, acao, enviando] = useActionState(pagarConta, INICIAL);
  const valores = estado.valores ?? {};
  const erros = estado.erros ?? {};

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={conta.id} />
      <AvisoDeObrigatorios />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoRotulado
          rotulo="Valor pago"
          htmlFor="pagamento-valor"
          erro={erros.valor}
          obrigatorio
          dica="Mude se pagou com juros ou desconto."
        >
          <input
            id="pagamento-valor"
            name="valor"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={valores.valor ?? reaisParaCampo(conta.valor)}
            className={juntar(campo, "tabular-nums")}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="Pago em" htmlFor="pagamento-data" erro={erros.paga_em}>
          <input
            id="pagamento-data"
            type="date"
            name="paga_em"
            max={hoje}
            defaultValue={valores.paga_em || hoje}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="Como foi paga" htmlFor="pagamento-forma" erro={erros.forma} obrigatorio>
          <select
            key={valores.forma}
            id="pagamento-forma"
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
      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          {enviando ? "Registrando..." : "Marcar como paga"}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}

type PropsDaConfirmacao = {
  id: number;
  acao: (anterior: EstadoSimples, dados: FormData) => Promise<EstadoSimples>;
  icone: Icon;
  rotulo: string;
  confirmar: string;
  enviandoRotulo: string;
  aviso: string;
  perigo?: boolean;
};

// As ações que desfazem ou apagam pedem uma segunda confirmação na própria tela, sem janela do
// navegador.
function AcaoConfirmada({
  id,
  acao: acaoDoServidor,
  icone: Icone,
  rotulo,
  confirmar,
  enviandoRotulo,
  aviso,
  perigo = false,
}: PropsDaConfirmacao) {
  const [estado, acao, enviando] = useActionState(acaoDoServidor, INICIAL_SIMPLES);
  const [confirmando, setConfirmando] = useState(false);
  const variante = perigo ? "perigo" : "secundario";

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className={botao(variante, "sm")}>
        <Icone size={15} />
        {rotulo}
      </button>
    );
  }

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-borda p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm">{aviso}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enviando} className={botao(variante, "sm")}>
          {enviando ? enviandoRotulo : confirmar}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => setConfirmando(false)}
          className={botao("fantasma", "sm")}
        >
          Cancelar
        </button>
      </div>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}

export function DesfazerPagamento({ id }: { id: number }) {
  return (
    <AcaoConfirmada
      id={id}
      acao={desfazerPagamento}
      icone={ArrowUUpLeftIcon}
      rotulo="Desfazer pagamento"
      confirmar="Sim, desfazer"
      enviandoRotulo="Desfazendo..."
      aviso="A conta volta a ficar a pagar, com o mesmo valor e o mesmo vencimento."
    />
  );
}

export function PararDeRepetir({ id }: { id: number }) {
  return (
    <AcaoConfirmada
      id={id}
      acao={pararDeRepetir}
      icone={ProhibitIcon}
      rotulo="Parar de repetir"
      confirmar="Sim, parar"
      enviandoRotulo="Parando..."
      aviso="As próximas deixam de aparecer, e as que já estavam na lista, depois desta e sem pagamento, saem dela. Esta conta continua."
    />
  );
}

export function RemoverConta({ id, repete }: { id: number; repete: boolean }) {
  const aviso = repete
    ? "A conta sai da lista, e a remoção fica registrada com o seu nome. As próximas continuam aparecendo; para parar, use Parar de repetir."
    : "A conta sai da lista, e a remoção fica registrada com o seu nome.";

  return (
    <AcaoConfirmada
      id={id}
      acao={removerConta}
      icone={TrashIcon}
      rotulo="Remover conta"
      confirmar="Sim, remover"
      enviandoRotulo="Removendo..."
      aviso={aviso}
      perigo
    />
  );
}
