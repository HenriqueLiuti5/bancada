// Brasília é o fuso do Bancada e o de quem ainda não tem assistência: a página inicial, a
// demonstração e o painel da plataforma. As telas da assistência usam o fuso escolhido por ela.
export const FUSO_HORARIO = "America/Sao_Paulo";

export function hojeEmIso(fuso: string = FUSO_HORARIO): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: fuso });
}

export function diaEHora(iso: string, fuso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
}

export function dataEHora(iso: string, fuso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
}

export function dataDoMomento(iso: string, fuso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: fuso,
  });
}

export function horaEMinuto(momento: Date, fuso: string): string {
  return momento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
}

export function hojePorExtenso(fuso: string): string {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: fuso,
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function meioDoDia(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function diaEMes(iso: string): string {
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

function meioDoMes(anoMes: string): Date {
  return meioDoDia(`${anoMes}-15`);
}

export function mesPorExtenso(anoMes: string): string {
  return meioDoMes(anoMes).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: FUSO_HORARIO,
  });
}

export function nomeDoMes(anoMes: string): string {
  return meioDoMes(anoMes).toLocaleDateString("pt-BR", { month: "long", timeZone: FUSO_HORARIO });
}

export function mesAbreviado(anoMes: string): string {
  return meioDoMes(anoMes)
    .toLocaleDateString("pt-BR", { month: "short", timeZone: FUSO_HORARIO })
    .replace(".", "");
}

export function diaEMesEmNumeros(iso: string): string {
  return meioDoDia(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO_HORARIO,
  });
}

const MILISSEGUNDOS_POR_DIA = 86_400_000;

export function diasEntre(de: string, ate: string): number {
  return Math.round((meioDoDia(ate).getTime() - meioDoDia(de).getTime()) / MILISSEGUNDOS_POR_DIA);
}

export function somarDias(iso: string, dias: number): string {
  const dia = meioDoDia(iso);
  dia.setDate(dia.getDate() + dias);
  return dia.toISOString().slice(0, 10);
}
