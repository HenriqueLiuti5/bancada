import { diaPorExtenso } from "@/lib/datas";
import type { Ciclo, Fundadores, PlanoDaAssinatura, TamanhoDaAssistencia } from "@/lib/tipos";

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
