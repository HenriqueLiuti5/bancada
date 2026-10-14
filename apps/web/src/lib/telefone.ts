const CODIGO_DO_BRASIL = "55";
const PREFIXO_DE_LONGA_DISTANCIA = "0";
const DIGITOS_DO_CELULAR = 11;
const DIGITOS_DO_FIXO = 10;
const INICIOS_DO_FIXO = "2345";
const PRIMEIRO_INICIO_DE_CELULAR_ANTIGO = 6;
const TAMANHOS = "Com o DDD, celular tem 11 dígitos e fixo tem 10.";

const DDDS_POR_ESTADO: Record<string, string> = {
  SP: "11 12 13 14 15 16 17 18 19",
  RJ: "21 22 24",
  ES: "27 28",
  MG: "31 32 33 34 35 37 38",
  PR: "41 42 43 44 45 46",
  SC: "47 48 49",
  RS: "51 53 54 55",
  DF: "61",
  GO: "62 64",
  TO: "63",
  MT: "65 66",
  MS: "67",
  AC: "68",
  RO: "69",
  BA: "71 73 74 75 77",
  SE: "79",
  PE: "81 87",
  AL: "82",
  PB: "83",
  RN: "84",
  CE: "85 88",
  PI: "86 89",
  PA: "91 93 94",
  AM: "92 97",
  RR: "95",
  AP: "96",
  MA: "98 99",
};

const ESTADO_DO_DDD = new Map(
  Object.entries(DDDS_POR_ESTADO).flatMap(([estado, ddds]) =>
    ddds.split(" ").map((ddd) => [ddd, estado] as const),
  ),
);

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function semPrefixos(digitos: string): string {
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith(CODIGO_DO_BRASIL)) {
    return digitos.slice(CODIGO_DO_BRASIL.length);
  }
  if ((digitos.length === 11 || digitos.length === 12) && digitos.startsWith(PREFIXO_DE_LONGA_DISTANCIA)) {
    return digitos.slice(PREFIXO_DE_LONGA_DISTANCIA.length);
  }
  return digitos;
}

export function formatarTelefone(valor: string): string {
  const digitos = soDigitos(valor);

  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

  return valor;
}

export function problemaDoTelefone(valor: string): string | null {
  const digitos = semPrefixos(soDigitos(valor));
  const total = digitos.length;

  if (total < DIGITOS_DO_FIXO) {
    const digitados = total === 1 ? "1 dígito" : `${total} dígitos`;
    return `O número está incompleto: tem ${digitados}. ${TAMANHOS}`;
  }
  if (total > DIGITOS_DO_CELULAR) return `O número tem dígitos a mais: são ${total}. ${TAMANHOS}`;

  const ddd = digitos.slice(0, 2);
  if (!ESTADO_DO_DDD.has(ddd)) return `O DDD ${ddd} não existe. Confira os dois primeiros números.`;

  const primeiro = digitos[2];
  if (total === DIGITOS_DO_CELULAR && primeiro !== "9") {
    return "Celular começa com 9 depois do DDD. Confira o número.";
  }
  if (total === DIGITOS_DO_FIXO && !INICIOS_DO_FIXO.includes(primeiro)) {
    return Number(primeiro) >= PRIMEIRO_INICIO_DE_CELULAR_ANTIGO
      ? "Falta um dígito: celular tem 9 números depois do DDD."
      : "Confira o número: depois do DDD, celular começa com 9 e fixo com 2, 3, 4 ou 5.";
  }
  return null;
}

export function conferenciaDoTelefone(valor: string): string | null {
  if (problemaDoTelefone(valor)) return null;

  const digitos = semPrefixos(soDigitos(valor));
  const ddd = digitos.slice(0, 2);
  const tipo = digitos.length === DIGITOS_DO_CELULAR ? "celular" : "fixo";
  return `${formatarTelefone(digitos)}, ${tipo} com DDD ${ddd} (${ESTADO_DO_DDD.get(ddd)})`;
}

export function telefoneArrumado(valor: string): string {
  return problemaDoTelefone(valor) ? valor : formatarTelefone(semPrefixos(soDigitos(valor)));
}
