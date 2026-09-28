const MENOS = "−";

function comSinal(texto: string, subiu: boolean): string {
  return `${subiu ? "+" : MENOS}${texto}`;
}

function diferenca(atual: number, anterior: number, emPontos: boolean): string | null {
  const distancia = Math.abs(atual - anterior);
  if (emPontos) {
    return `${distancia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`;
  }
  if (anterior === 0) return null;
  return `${Math.round((distancia / anterior) * 100)}%`;
}

export function Variacao({
  atual,
  anterior,
  formatar,
  emPontos = false,
}: {
  atual: number | null;
  anterior: number | null;
  formatar: (valor: number) => string;
  emPontos?: boolean;
}) {
  if (anterior === null) return <span>sem dados no período anterior</span>;

  const antes = `antes ${formatar(anterior)}`;
  if (atual === null) return <span>{antes}</span>;
  if (atual === anterior) return <span>igual ao período anterior</span>;

  const texto = diferenca(atual, anterior, emPontos);
  if (!texto) return <span>{antes}</span>;

  return (
    <span>
      <span className="font-medium text-texto-suave">{comSinal(texto, atual > anterior)}</span>
      {` · ${antes}`}
    </span>
  );
}
