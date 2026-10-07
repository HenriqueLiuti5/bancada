import Image, { type StaticImageData } from "next/image";
import { juntar } from "@/componentes/ui/estilos";

type Props = {
  imagem: StaticImageData;
  descricao: string;
  tamanhos: string;
  className?: string;
  antecipar?: boolean;
};

export function TelaDoComputador({ imagem, descricao, tamanhos, className, antecipar = false }: Props) {
  return (
    <div
      className={juntar(
        "overflow-hidden rounded-2xl border border-borda-forte bg-superficie shadow-elevada",
        className,
      )}
    >
      <Image src={imagem} alt={descricao} sizes={tamanhos} preload={antecipar} className="h-auto w-full" />
    </div>
  );
}

export function TelaDoCelular({ imagem, descricao, tamanhos, className, antecipar = false }: Props) {
  return (
    <div
      className={juntar(
        "rounded-[2.6rem] border-[9px] border-lateral bg-lateral shadow-elevada",
        className,
      )}
    >
      <Image
        src={imagem}
        alt={descricao}
        sizes={tamanhos}
        preload={antecipar}
        className="h-auto w-full rounded-[2rem]"
      />
    </div>
  );
}
