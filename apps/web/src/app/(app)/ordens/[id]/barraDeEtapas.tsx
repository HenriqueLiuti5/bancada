import { caminhoDo } from "@/componentes/ProgressoDoReparo";
import { juntar } from "@/componentes/ui/estilos";

const COLUNAS: Record<number, string> = { 4: "grid-cols-4", 5: "grid-cols-5" };

export function BarraDeEtapas({ status }: { status: string }) {
  const passos = caminhoDo(status);
  const atual = passos.findIndex((passo) => passo.status.includes(status));

  return (
    <ol aria-label="Andamento do reparo" className={juntar("grid gap-1 sm:gap-1.5", COLUNAS[passos.length])}>
      {passos.map((passo, indice) => (
        <li
          key={passo.rotulo}
          aria-current={indice === atual ? "step" : undefined}
          className="min-w-0 space-y-1.5"
        >
          <span
            aria-hidden="true"
            className={juntar("block h-1.5 rounded-full", indice <= atual ? "bg-primario" : "bg-borda")}
          />
          <span
            className={juntar(
              "block truncate text-[10px] sm:text-xs",
              indice === atual ? "font-semibold text-texto" : "font-medium text-texto-apagado",
            )}
          >
            {passo.rotulo}
            {indice < atual && <span className="sr-only"> (concluído)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
