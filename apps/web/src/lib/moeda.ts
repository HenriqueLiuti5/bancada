const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MOEDA_CURTA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
});

const SO_MILHARES = /^\d{1,3}(\.\d{3})+$/;
const DECIMAL_NORMALIZADO = /^\d+(\.\d{1,2})?$/;

export function emReais(valor: string | number): string {
  return MOEDA.format(Number(valor));
}

// Para onde o valor inteiro não cabe, como os rótulos de um gráfico: R$ 950, R$ 8,3 mil.
export function emReaisCurto(valor: string | number): string {
  return MOEDA_CURTA.format(Number(valor));
}

function normalizar(limpo: string): string {
  if (limpo.includes(",")) return limpo.replaceAll(".", "").replace(",", ".");
  if (SO_MILHARES.test(limpo)) return limpo.replaceAll(".", "");
  return limpo;
}

export function lerReais(digitado: string): string | null {
  const limpo = digitado.replace(/R\$|\s/g, "");
  const normalizado = normalizar(limpo);
  return DECIMAL_NORMALIZADO.test(normalizado) ? normalizado : null;
}

export function emCentavos(digitado: string): number | null {
  const normalizado = lerReais(digitado);
  return normalizado === null ? null : Math.round(Number(normalizado) * 100);
}

export function centavosParaCampo(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function reaisParaCampo(valor: string): string {
  return centavosParaCampo(Math.round(Number(valor) * 100));
}

export function centavosEmReais(centavos: number): string {
  return emReais(centavos / 100);
}
