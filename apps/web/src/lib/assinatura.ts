import { diaPorExtenso } from "@/lib/datas";
import type { Ciclo, PlanoDaAssinatura, TamanhoDaAssistencia } from "@/lib/tipos";

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

export function precoDoPlano(plano: PlanoDaAssinatura, ciclo: Ciclo): string {
  return ciclo === "anual" ? plano.anual : plano.mensal;
}

// O anual dividido pelos 12 meses que ele cobre, para comparar com o mensal.
export function mensalNoAnual(plano: PlanoDaAssinatura): string {
  return (Math.round((Number(plano.anual) * 100) / 12) / 100).toFixed(2);
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
