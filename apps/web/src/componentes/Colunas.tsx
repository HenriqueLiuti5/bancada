import { juntar } from "@/componentes/ui/estilos";

export type Coluna = {
  chave: string;
  rotulo: string;
  descricao: string;
  medida: number;
  valor: string;
};

type Props = {
  colunas: Coluna[];
  titulo: string;
  nomeDoPeriodo: string;
  nomeDaMedida: string;
  passoNoCelular?: number;
  dinheiro?: boolean;
};

const DISTANCIA_MINIMA_ENTRE_ROTULOS = 3;
const TAMANHO_DE_ROTULO_CURTO = 3;

type Rotulo = "sempre" | "fora-do-celular";

function indiceDoMaior(colunas: Coluna[]): number {
  return colunas.reduce(
    (maior, coluna, indice) => (coluna.medida > colunas[maior].medida ? indice : maior),
    0,
  );
}

function rotulos(colunas: Coluna[]): Map<number, Rotulo> {
  const ultima = colunas.length - 1;
  const maior = indiceDoMaior(colunas);
  const mapa = new Map<number, Rotulo>();
  const ultimaTemValor = (colunas[ultima]?.medida ?? 0) > 0;

  if (ultimaTemValor) mapa.set(ultima, "sempre");
  if (maior === ultima || (colunas[maior]?.medida ?? 0) <= 0) return mapa;

  const distancia = ultima - maior;
  const curtos = [colunas[maior], colunas[ultima]].every(
    (coluna) => coluna.valor.length <= TAMANHO_DE_ROTULO_CURTO,
  );
  if (!ultimaTemValor || curtos || distancia >= DISTANCIA_MINIMA_ENTRE_ROTULOS) {
    mapa.set(maior, "sempre");
  } else if (distancia === DISTANCIA_MINIMA_ENTRE_ROTULOS - 1) {
    mapa.set(maior, "fora-do-celular");
  }
  return mapa;
}

function Dica({
  coluna,
  aDireita,
  dinheiro,
}: {
  coluna: Coluna;
  aDireita: boolean;
  dinheiro: boolean;
}) {
  return (
    <span
      className={juntar(
        "pointer-events-none absolute top-0 z-10 rounded-xl border border-borda bg-superficie px-3 py-2 text-left whitespace-nowrap opacity-0 shadow-elevada transition-opacity duration-150 group-hover:opacity-100",
        aDireita ? "right-0" : "left-0",
      )}
    >
      <span
        className={juntar(
          "block text-[13px] font-semibold text-texto",
          dinheiro && "text-dinheiro",
        )}
      >
        {coluna.valor}
      </span>
      <span className="block text-[11px] text-texto-suave">{coluna.descricao}</span>
    </span>
  );
}

function Barra({
  coluna,
  fracao,
  rotulo,
  aDireita,
  dinheiro,
}: {
  coluna: Coluna;
  fracao: number;
  rotulo?: Rotulo;
  aDireita: boolean;
  dinheiro: boolean;
}) {
  return (
    <li className="group relative flex h-full flex-1 items-end justify-center">
      {fracao > 0 && (
        <span
          className="relative block w-full max-w-6 rounded-t-md bg-grafico transition-colors duration-150 group-hover:bg-grafico-forte"
          style={{ height: `${Math.max(fracao * 100, 2)}%` }}
        >
          {rotulo && (
            <span
              className={juntar(
                "absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-full bg-superficie px-1 text-[11px] font-semibold whitespace-nowrap text-texto-suave",
                rotulo === "fora-do-celular" && "max-sm:hidden",
                dinheiro && "text-dinheiro",
              )}
            >
              {coluna.valor}
            </span>
          )}
        </span>
      )}
      <Dica coluna={coluna} aDireita={aDireita} dinheiro={dinheiro} />
    </li>
  );
}

function Tabela({ colunas, nomeDoPeriodo, nomeDaMedida, dinheiro }: Omit<Props, "titulo">) {
  return (
    <details className="border-t border-borda">
      <summary className="cursor-pointer px-5 py-3 text-[13px] font-medium text-texto-apagado transition-colors select-none hover:text-texto">
        Ver os números
      </summary>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-t border-borda text-left text-xs text-texto-suave">
            <th scope="col" className="px-5 py-2 font-medium">
              {nomeDoPeriodo}
            </th>
            <th scope="col" className="px-5 py-2 text-right font-medium">
              {nomeDaMedida}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda border-t border-borda">
          {colunas.map((coluna) => (
            <tr key={coluna.chave}>
              <td className="px-5 py-1.5">{coluna.descricao}</td>
              <td
                className={juntar(
                  "px-5 py-1.5 text-right tabular-nums",
                  dinheiro && "text-dinheiro",
                )}
              >
                {coluna.valor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function Colunas({
  colunas,
  titulo,
  nomeDoPeriodo,
  nomeDaMedida,
  passoNoCelular = 1,
  dinheiro = false,
}: Props) {
  const escala = Math.max(...colunas.map((coluna) => coluna.medida), 0);
  const rotuladas = rotulos(colunas);
  const ultima = colunas.length - 1;

  return (
    <figure>
      <figcaption className="sr-only">{titulo}</figcaption>
      <div aria-hidden="true" className="px-5 pt-2">
        <ol className="flex h-40 items-end gap-0.5 border-b border-borda pt-5">
          {colunas.map((coluna, indice) => (
            <Barra
              key={coluna.chave}
              coluna={coluna}
              fracao={escala > 0 ? coluna.medida / escala : 0}
              rotulo={rotuladas.get(indice)}
              aDireita={indice >= colunas.length / 2}
              dinheiro={dinheiro}
            />
          ))}
        </ol>
        <ol className="flex gap-0.5 pt-1.5 pb-3">
          {colunas.map((coluna, indice) => (
            <li
              key={coluna.chave}
              className={juntar(
                "flex min-w-0 flex-1 justify-center text-[11px] whitespace-nowrap text-texto-apagado tabular-nums",
                (ultima - indice) % passoNoCelular !== 0 && "max-sm:invisible",
              )}
            >
              <span>{coluna.rotulo}</span>
            </li>
          ))}
        </ol>
      </div>
      <Tabela
        colunas={colunas}
        nomeDoPeriodo={nomeDoPeriodo}
        nomeDaMedida={nomeDaMedida}
        dinheiro={dinheiro}
      />
    </figure>
  );
}
