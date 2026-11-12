import { dataCurta, diaPorExtenso } from "@/lib/datas";
import { haDias } from "@/lib/formatos";
import type { Ciclo, Fundadores, PlanoDaAssinatura, TamanhoDaAssistencia } from "@/lib/tipos";

// Um teste de mais de um ano só existe estendido à mão, como o da conta de testes: aí a contagem de
// dias não diz nada, e a data basta.
const DIAS_DE_TESTE_SEM_CONTAGEM = 365;
// Nos últimos dias do teste, quem ainda não assinou merece uma conversa.
const DIAS_DO_FIM_DO_TESTE_EM_DESTAQUE = 3;

export function prazoDoTeste(dias: number, terminaEm: string): string {
  const data = dataCurta(terminaEm);
  if (dias > DIAS_DE_TESTE_SEM_CONTAGEM) return `Teste grátis até ${data}`;
  if (dias > 1) return `Teste grátis até ${data}, faltam ${dias} dias`;
  if (dias === 1) return `Teste grátis até ${data}, termina amanhã`;
  if (dias === 0) return `Teste grátis até ${data}, termina hoje`;
  return `Teste grátis terminou ${haDias(-dias)}, em ${data}`;
}

export function testePertoDoFim(dias: number): boolean {
  return dias >= 0 && dias <= DIAS_DO_FIM_DO_TESTE_EM_DESTAQUE;
}

export function avisoDaExclusao(apagaEm: string | null): string | null {
  if (!apagaEm) return null;
  return `Se continuar só para consulta, a conta é apagada com todos os dados em ${diaPorExtenso(apagaEm)}.`;
}

export function nomeDaCobranca(ciclo: Ciclo | ""): string {
  return ciclo === "anual" ? "anuidade" : "mensalidade";
}

export function porPeriodo(ciclo: Ciclo | ""): string {
  return ciclo === "anual" ? "por ano" : "por mês";
}

type PrecosDoPlano = Pick<PlanoDaAssinatura, "mensal" | "anual" | "fundador_mensal" | "fundador_anual">;

export function precoDoPlano(plano: PrecosDoPlano, ciclo: Ciclo, fundador = false): string {
  if (fundador) return ciclo === "anual" ? plano.fundador_anual : plano.fundador_mensal;
  return ciclo === "anual" ? plano.anual : plano.mensal;
}

// O anual dividido pelos 12 meses que ele cobre, para comparar com o mensal.
export function mensalNoAnual(plano: PrecosDoPlano, fundador = false): string {
  const anual = precoDoPlano(plano, "anual", fundador);
  return (Math.round((Number(anual) * 100) / 12) / 100).toFixed(2);
}

export function vagasDeFundador({ restantes, vagas }: Fundadores): string {
  const palavra = restantes === 1 ? "vaga" : "vagas";
  return `Restam ${restantes} de ${vagas} ${palavra} de fundador`;
}

export function avisoDoFundador(fundadores: Fundadores): string {
  return `Preço de fundador, com ${fundadores.desconto}% a menos. ${vagasDeFundador(fundadores)}. Vale enquanto a assinatura continuar e acaba se você cancelar: a vaga não volta.`;
}

export function tamanhoDoPlano({ lojas, pessoas }: Pick<PlanoDaAssinatura, "lojas" | "pessoas">): string {
  const ateAsLojas = lojas === 1 ? "1 loja" : `até ${lojas} lojas`;
  return `${ateAsLojas}, ${pessoas === null ? "pessoas ilimitadas" : `até ${pessoas} pessoas`}`;
}

function contagem(total: number, uma: string, varias: string): string {
  return `${total} ${total === 1 ? uma : varias}`;
}

export function tamanhoDaAssistencia({ lojas, pessoas }: TamanhoDaAssistencia): string {
  return `${contagem(lojas, "loja ativa", "lojas ativas")} e ${contagem(pessoas, "pessoa", "pessoas")}`;
}
