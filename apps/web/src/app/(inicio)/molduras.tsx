import Image, { type StaticImageData } from "next/image";
import { BatteryFullIcon, CellSignalFullIcon, WifiHighIcon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import { QUALIDADE_DAS_CAPTURAS } from "@/lib/capturas";

type Props = {
  imagem: StaticImageData;
  descricao: string;
  tamanhos: string;
  className?: string;
  antecipar?: boolean;
};

// O desenho dos aparelhos fica nas classes .notebook-* e .celular-* do globals.css. As medidas são em
// cqw, frações da largura de cada aparelho, para o desenho manter as proporções em qualquer tela.

// O isolate prende dentro do notebook o z-index que põe a tampa e a base sobre a sombra dele. Sem
// ele, a tampa passava também por cima do celular que fica à frente do notebook.
export function TelaDoComputador({ imagem, descricao, tamanhos, className, antecipar = false }: Props) {
  return (
    <div className={juntar("@container", className)}>
      <div className="notebook relative isolate">
        <div className="notebook-tampa relative z-10 mx-auto w-[88cqw]">
          <div className="notebook-moldura">
            <span className="notebook-camera" />
            <div className="notebook-tela">
              <Image
                src={imagem}
                alt={descricao}
                sizes={tamanhos}
                preload={antecipar}
                quality={QUALIDADE_DAS_CAPTURAS}
                className="block h-auto w-full"
              />
              <span className="notebook-apagado" />
              <span className="tela-reflexo" />
            </div>
          </div>
        </div>
        <div className="notebook-base">
          <span className="notebook-encaixe" />
        </div>
        <span className="notebook-sombra" />
      </div>
    </div>
  );
}

// A barra de status continua a cor do alto da captura: o fundo claro da página do cliente ou a barra
// preta do sistema no celular. A câmera fica num furo no meio dela, como na maioria dos Android.
function BarraDeStatus({ escura }: { escura: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={juntar(
        "relative flex h-[7.5cqw] items-center justify-between px-[7cqw] text-[3.3cqw] leading-none font-semibold",
        escura ? "bg-lateral text-lateral-texto" : "bg-tela text-tela-texto",
      )}
    >
      <span className="tabular-nums">14:32</span>
      <span className="celular-camera" />
      <span className="flex items-center gap-[0.9cqw]">
        <CellSignalFullIcon weight="fill" />
        <WifiHighIcon weight="bold" />
        <BatteryFullIcon weight="fill" className="text-[4cqw]" />
      </span>
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
  barraEscura = false,
  children,
}: Props & { elevado?: boolean; barraEscura?: boolean; children?: React.ReactNode }) {
  return (
    <div className={juntar("@container", className)}>
      <div className={juntar("celular", elevado && "celular-elevado")}>
        <div className="celular-vidro">
          <div className="celular-tela">
            <BarraDeStatus escura={barraEscura} />
            <Image
              src={imagem}
              alt={descricao}
              sizes={tamanhos}
              preload={antecipar}
              quality={QUALIDADE_DAS_CAPTURAS}
              className="block h-auto w-full"
            />
            {children}
            <span className="tela-reflexo" />
          </div>
        </div>
        <span className="celular-botao top-[24cqw] h-[15cqw]" />
        <span className="celular-botao top-[44cqw] h-[9cqw]" />
      </div>
    </div>
  );
}
