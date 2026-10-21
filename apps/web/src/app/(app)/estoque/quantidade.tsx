import { WarningIcon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import type { Produto } from "@/lib/tipos";

export function QuantidadeDoProduto({ produto }: { produto: Produto }) {
  const falta = produto.quantidade < 0;

  return (
    <span className="block">
      <span
        className={juntar(
          "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
          produto.para_repor && "text-perigo",
        )}
      >
        {produto.para_repor && <WarningIcon size={15} />}
        {falta ? `Faltam ${-produto.quantidade}` : `${produto.quantidade} un.`}
      </span>
      {produto.por_loja.length > 0 && (
        <span className="block truncate text-xs text-texto-apagado">
          {produto.por_loja.map((linha) => `${linha.nome} ${linha.quantidade}`).join(" · ")}
        </span>
      )}
    </span>
  );
}
