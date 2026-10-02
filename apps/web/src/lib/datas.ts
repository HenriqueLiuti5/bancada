export const FUSO_HORARIO = "America/Sao_Paulo";

function meioDoDia(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function diaEMes(iso: string): string {
  return meioDoDia(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: FUSO_HORARIO,
  });
}

export function diaPorExtenso(iso: string): string {
  return meioDoDia(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: FUSO_HORARIO,
  });
}

export function dataCurta(iso: string): string {
  return meioDoDia(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: FUSO_HORARIO,
  });
}

export function intervaloEscrito(inicio: string, fim: string): string {
  if (inicio === fim) return diaEMes(inicio);
  if (inicio.slice(0, 7) === fim.slice(0, 7)) {
    return `${meioDoDia(inicio).getDate()} a ${diaEMes(fim)}`;
  }
  return `${diaEMes(inicio)} a ${diaEMes(fim)}`;
}
