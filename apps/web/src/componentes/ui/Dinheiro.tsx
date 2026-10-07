import { juntar } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";

export function Dinheiro({
  valor,
  saida = false,
  className,
}: {
  valor: string | number;
  saida?: boolean;
  className?: string;
}) {
  return (
    <span className={juntar("text-dinheiro tabular-nums", className)}>
      {saida && "−"}
      {emReais(valor)}
    </span>
  );
}
