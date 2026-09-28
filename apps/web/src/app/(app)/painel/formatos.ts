const HORAS_POR_DIA = 24;

export function emDias(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor.toLocaleString("pt-BR")} ${valor === 1 ? "dia" : "dias"}`;
}

export function emHoras(horas: number): string {
  if (horas < HORAS_POR_DIA) {
    return `${horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  }
  return emDias(Math.round((horas / HORAS_POR_DIA) * 10) / 10);
}

export function emPorcentagem(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function contagem(total: number, singular: string, plural: string): string {
  return `${total} ${total === 1 ? singular : plural}`;
}
