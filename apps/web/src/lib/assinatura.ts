import { diaPorExtenso } from "@/lib/datas";

export function avisoDaExclusao(apagaEm: string | null): string | null {
  if (!apagaEm) return null;
  return `Se continuar só para consulta, a conta é apagada com todos os dados em ${diaPorExtenso(apagaEm)}.`;
}
