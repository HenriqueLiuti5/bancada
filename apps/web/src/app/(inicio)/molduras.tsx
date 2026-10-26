import Image, { type StaticImageData } from "next/image";
import { juntar } from "@/componentes/ui/estilos";
import { QUALIDADE_DAS_CAPTURAS } from "@/lib/capturas";

type Props = {
  imagem: StaticImageData;
  descricao: string;
  tamanhos: string;
  className?: string;
  antecipar?: boolean;
};

// As medidas dos aparelhos são em cqw, frações da largura de cada um, para o desenho manter as
// proporções em qualquer tamanho de tela.

export function TelaDoComputador({ imagem, descricao, tamanhos, className, antecipar = false }: Props) {
  return (
    <div className={juntar("@container", className)}>
      <div className="relative mx-auto w-[86cqw] rounded-t-[2.4cqw] bg-aparelho px-[1.7cqw] py-[2.2cqw] inset-ring-[0.3cqw] inset-ring-aparelho-aro">
        <span className="absolute top-[0.75cqw] left-1/2 size-[0.7cqw] -translate-x-1/2 rounded-full bg-aparelho-lente" />
        <Image
          src={imagem}
          alt={descricao}
          sizes={tamanhos}
          preload={antecipar}
          quality={QUALIDADE_DAS_CAPTURAS}
          className="h-auto w-full ring-[0.12cqw] ring-aparelho-aro"
        />
      </div>
      <div className="relative h-[2.6cqw] rounded-b-[1.8cqw] border-b-[1.1cqw] border-aparelho-base-frente bg-aparelho-base shadow-elevada">
        <span className="absolute top-0 left-1/2 h-[0.65cqw] w-[13cqw] -translate-x-1/2 rounded-b-[0.65cqw] bg-aparelho-encaixe" />
      </div>
    </div>
  );
}

export function TelaDoCelular({
  imagem,
  descricao,
  tamanhos,
  className,
  antecipar = false,
  elevado = true,
}: Props & { elevado?: boolean }) {
  return (
    <div className={juntar("@container", className)}>
      <div
        className={juntar(
          "relative rounded-[15cqw] bg-aparelho p-[3.4cqw] inset-ring-[0.9cqw] inset-ring-aparelho-aro",
          elevado && "shadow-elevada",
        )}
      >
        <Image
          src={imagem}
          alt={descricao}
          sizes={tamanhos}
          preload={antecipar}
          quality={QUALIDADE_DAS_CAPTURAS}
          className="h-auto w-full rounded-[11.6cqw]"
        />
        <span className="absolute top-[6.2cqw] left-1/2 size-[3.6cqw] -translate-x-1/2 rounded-full bg-aparelho inset-ring-[0.6cqw] inset-ring-aparelho-lente" />
        <span className="absolute top-[30cqw] left-full h-[16cqw] w-[0.9cqw] rounded-r-[0.5cqw] bg-aparelho-aro" />
        <span className="absolute top-[52cqw] left-full h-[9cqw] w-[0.9cqw] rounded-r-[0.5cqw] bg-aparelho-aro" />
      </div>
    </div>
  );
}
