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

export function haDias(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

export function formatarDocumento(valor: string): string {
  if (/^\d{11}$/.test(valor)) {
    return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
  }
  if (/^[0-9A-Z]{14}$/.test(valor)) {
    return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}/${valor.slice(8, 12)}-${valor.slice(12)}`;
  }
  return valor;
}
