import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { ErroDaApi, chamarApi, mensagemDaApi } from "@/lib/api";
import { FUSO_HORARIO } from "@/lib/datas";
import type { Loja, Painel } from "@/lib/tipos";
import { PrimeirosPassos } from "../primeirosPassos";
import { Tour } from "../tour";
import { SecaoAtendimento } from "./atendimento";
import { SecaoDinheiro } from "./dinheiro";
import { SecaoEquipe } from "./equipe";
import { FiltrosDoPainel } from "./filtrosDoPainel";
import { SecaoOperacao } from "./operacao";
import { Secao } from "./secao";

export const dynamic = "force-dynamic";

const PARAMETROS = ["periodo", "de", "ate", "loja"] as const;

type Parametros = Record<string, string | string[] | undefined>;

function hojeEscrito(): string {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: FUSO_HORARIO,
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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

function Agora({ agora }: { agora: Painel["agora"] }) {
  return (
    <Secao titulo="Agora" descricao="Como a loja está neste momento, sem depender do período.">
      <GradeDeIndicadores tour="indicadores">
        <Indicador
          rotulo="Na bancada"
          valor={String(agora.abertas)}
          nota="ordens ainda abertas"
          href="/ordens?situacao=abertas"
        />
        <Indicador
          rotulo="Atrasadas"
          valor={String(agora.atrasadas)}
          nota="passaram do prazo prometido"
          href="/ordens?atrasadas=1"
          alerta={agora.atrasadas > 0}
        />
        <Indicador
          rotulo="Esperando o cliente"
          valor={String(agora.aguardando_cliente)}
          nota="orçamento enviado, sem resposta"
          href="/ordens?status=orcamento_enviado"
        />
        <Indicador
          rotulo="Prontas para retirada"
          valor={String(agora.prontas)}
          nota="ocupando a prateleira"
          href="/ordens?status=pronto"
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
  const [{ painel, erro }, lojas] = await Promise.all([
    buscarPainel(consulta),
    chamarApi<Loja[]>("/api/lojas/"),
  ]);
  const loja = erro ? "" : (consulta.get("loja") ?? "");

  return (
    <>
      <CabecalhoDaPagina titulo="Painel" descricao={hojeEscrito()} />

      <PrimeirosPassos />

      <div className="space-y-10">
        <div className="space-y-3">
          <FiltrosDoPainel periodo={painel.periodo} lojas={lojas} loja={loja} />
          {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
        </div>

        <Agora agora={painel.agora} />
        {painel.dinheiro && <SecaoDinheiro dinheiro={painel.dinheiro} />}
        <SecaoOperacao painel={painel} />
        {painel.equipe && <SecaoEquipe equipe={painel.equipe} />}
        <SecaoAtendimento atendimento={painel.atendimento} />
      </div>

      <Tour nome="painel" />
    </>
  );
}
