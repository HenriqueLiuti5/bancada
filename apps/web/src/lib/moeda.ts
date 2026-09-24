const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const SO_MILHARES = /^\d{1,3}(\.\d{3})+$/;
const DECIMAL_NORMALIZADO = /^\d+(\.\d{1,2})?$/;

export function emReais(valor: string | number): string {
  return MOEDA.format(Number(valor));
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
