import { CheckIcon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";

export const conteiner = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

type Props = {
  sobretitulo: string;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  alinhamento?: "centro" | "esquerda";
};

export function CabecalhoDaSecao({ sobretitulo, titulo, descricao, alinhamento = "centro" }: Props) {
  return (
    <div className={juntar("max-w-2xl", alinhamento === "centro" && "mx-auto text-center")}>
      <p className="text-sm font-semibold text-destaque">{sobretitulo}</p>
      <h2 className="mt-3 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
        {titulo}
      </h2>
      {descricao && (
        <p className="mt-4 text-lg leading-relaxed text-pretty text-texto-suave">{descricao}</p>
      )}
    </div>
  );
}

export function ListaDeConferencia({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-snug text-texto-suave">
          <CheckIcon size={18} weight="bold" className="mt-px shrink-0 text-destaque" />
          {item}
        </li>
      ))}
    </ul>
  );
}
