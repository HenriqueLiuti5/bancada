import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import {
  AlarmIcon,
  ClockCountdownIcon,
  HourglassIcon,
  PackageIcon,
  PulseIcon,
  TrayArrowDownIcon,
  WrenchIcon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { Secao } from "@/componentes/ui/Secao";
import { ErroDaApi, chamarApi, mensagemDaApi } from "@/lib/api";
import { hojePorExtenso } from "@/lib/datas";
import type { Loja, Painel } from "@/lib/tipos";
import { fusoDaAssistencia, usuarioAtual } from "@/lib/usuario";
import { PrimeirosPassos } from "../primeirosPassos";
import { Tour } from "../tour";
import { SecaoAtendimento } from "./atendimento";
import { SecaoDinheiro } from "./dinheiro";
import { SecaoEquipe } from "./equipe";
import { FiltrosDoPainel } from "./filtrosDoPainel";
import { SecaoOperacao } from "./operacao";

export const dynamic = "force-dynamic";

const PARAMETROS = ["periodo", "de", "ate", "loja"] as const;

type Parametros = Record<string, string | string[] | undefined>;

function lerParametros(recebidos: Parametros): URLSearchParams {
  const consulta = new URLSearchParams();
  for (const chave of PARAMETROS) {
    const valor = recebidos[chave];
    if (typeof valor === "string" && valor !== "") consulta.set(chave, valor);
  }
  return consulta;
}

async function buscarPainel(
  consulta: URLSearchParams,
): Promise<{ painel: Painel; erro?: string }> {
  try {
    return { painel: await chamarApi<Painel>(`/api/ordens/painel/?${consulta}`) };
  } catch (erro) {
    if (!(erro instanceof ErroDaApi) || erro.status !== 400) throw erro;
    return {
      painel: await chamarApi<Painel>("/api/ordens/painel/"),
      erro: mensagemDaApi(erro, "Não deu para usar esse filtro. Mostramos o mês atual."),
    };
  }
}

function Agora({ agora, estoque }: { agora: Painel["agora"]; estoque: Painel["estoque"] }) {
  return (
    <Secao titulo="Agora" icone={PulseIcon} descricao="Como a loja está neste momento, sem depender do período.">
      <GradeDeIndicadores tour="indicadores" colunas={6}>
        <Indicador
          rotulo="Na bancada"
          icone={WrenchIcon}
          valor={String(agora.abertas)}
          nota="ordens ainda abertas"
          href="/ordens?situacao=abertas"
        />
        <Indicador
          rotulo="Atrasadas"
          icone={AlarmIcon}
          valor={String(agora.atrasadas)}
          nota="passaram do prazo prometido"
          href="/ordens?atrasadas=1"
          alerta={agora.atrasadas > 0}
        />
        <Indicador
          rotulo="Para hoje"
          icone={ClockCountdownIcon}
          valor={String(agora.para_hoje)}
          nota="prazo prometido para hoje"
          href="/ordens?para_hoje=1"
        />
        <Indicador
          rotulo="Esperando o cliente"
          icone={HourglassIcon}
          valor={String(agora.aguardando_cliente)}
          nota="orçamento enviado, sem resposta"
          href="/ordens?status=orcamento_enviado"
        />
        <Indicador
          rotulo="Prontas para retirada"
          icone={PackageIcon}
          valor={String(agora.prontas)}
          nota="ocupando a prateleira"
          href="/ordens?status=pronto"
        />
        <Indicador
          rotulo="Para repor"
          icone={TrayArrowDownIcon}
          valor={String(estoque.para_repor)}
          nota="produtos abaixo do mínimo"
          href="/estoque?situacao=repor"
          alerta={estoque.para_repor > 0}
        />
      </GradeDeIndicadores>
    </Secao>
  );
}

export default async function PainelDaLoja({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const consulta = lerParametros(await searchParams);
  const [{ painel, erro }, lojas, usuario] = await Promise.all([
    buscarPainel(consulta),
    chamarApi<Loja[]>("/api/lojas/"),
    usuarioAtual(),
  ]);
  const loja = erro ? "" : (consulta.get("loja") ?? "");

  return (
    <>
      <CabecalhoDaPagina titulo="Painel" descricao={hojePorExtenso(fusoDaAssistencia(usuario))} />

      <PrimeirosPassos />

      <div className="space-y-10">
        <div className="space-y-3">
          <FiltrosDoPainel periodo={painel.periodo} lojas={lojas} loja={loja} />
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
        </div>

        <Agora agora={painel.agora} estoque={painel.estoque} />
        {painel.dinheiro && <SecaoDinheiro dinheiro={painel.dinheiro} />}
        <SecaoOperacao painel={painel} />
        {painel.equipe && <SecaoEquipe equipe={painel.equipe} />}
        <SecaoAtendimento atendimento={painel.atendimento} />
      </div>

      <Tour nome="painel" />
    </>
  );
}
