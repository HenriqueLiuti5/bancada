"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { EnvelopeSimpleIcon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import { QUALIDADE_DAS_CAPTURAS } from "@/lib/capturas";
import { TelaDoCelular } from "./molduras";

// Quando o celular aparece, a cena da loja acontece nele: o aparelho está em reparo, chega o e-mail
// que o Reparium manda ao cliente quando a ordem fica pronta, e a página do cliente passa para Pronto. A cena
// roda uma vez a cada vez que o celular entra na tela, e não roda para quem pede menos movimento.
type Cena = "antes" | "aviso" | "pronto" | "fim";

const ROTEIRO: [Cena, number][] = [
  ["aviso", 1400],
  ["pronto", 2300],
  ["fim", 7000],
];

const COM_AVISO = "group-data-[cena=aviso]/cena:translate-y-0 group-data-[cena=aviso]/cena:opacity-100 group-data-[cena=pronto]/cena:translate-y-0 group-data-[cena=pronto]/cena:opacity-100";

type Props = {
  antes: StaticImageData;
  depois: StaticImageData;
  descricao: string;
  tamanhos: string;
  aparelho: string;
  className?: string;
};

export function CelularAoVivo({ antes, depois, descricao, tamanhos, aparelho, className }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const [cena, setCena] = useState<Cena>("antes");

  useEffect(() => {
    const elemento = raiz.current;
    if (!elemento || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let relogios: number[] = [];
    let tocou = false;
    const parar = () => {
      relogios.forEach((relogio) => window.clearTimeout(relogio));
      relogios = [];
    };
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) {
          parar();
          tocou = false;
          setCena("antes");
        } else if (entrada.intersectionRatio >= 0.6 && !tocou) {
          tocou = true;
          relogios = ROTEIRO.map(([proxima, espera]) => window.setTimeout(() => setCena(proxima), espera));
        }
      },
      { threshold: [0, 0.6] },
    );
    observador.observe(elemento);
    return () => {
      parar();
      observador.disconnect();
    };
  }, []);

  return (
    <div ref={raiz} data-cena={cena} className={juntar("group/cena", className)}>
      <TelaDoCelular
        imagem={antes}
        descricao={descricao}
        tamanhos={tamanhos}
        antecipar
        className="group-data-[cena=aviso]/cena:animate-vibrar"
      >
        {/* Na abertura, o navegador já baixa esta tela ao abrir a página. Sem o eager, quando ela
            aparece e vira a maior imagem à vista, o Next avisa no console que ela devia ser eager. */}
        <Image
          src={depois}
          alt=""
          sizes={tamanhos}
          loading="eager"
          quality={QUALIDADE_DAS_CAPTURAS}
          className="absolute inset-x-0 bottom-0 h-auto w-full opacity-0 transition-opacity duration-700 group-data-[cena=fim]/cena:opacity-100 group-data-[cena=pronto]/cena:opacity-100"
        />
        <div
          aria-hidden="true"
          className={juntar(
            "absolute inset-x-[3.5cqw] top-[9cqw] z-10 -translate-y-[140%] rounded-[5.5cqw] bg-tela-cartao px-[4.2cqw] py-[3.4cqw] text-tela-texto opacity-0 shadow-elevada ring-[0.3cqw] ring-tela-borda transition duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.15)]",
            COM_AVISO,
          )}
        >
          <div className="flex items-center gap-[1.8cqw] text-[3.2cqw] text-tela-texto-suave">
            <span className="grid size-[5.2cqw] place-items-center rounded-[1.5cqw] bg-tela-destaque text-[3.3cqw] text-tela-cartao">
              <EnvelopeSimpleIcon weight="fill" />
            </span>
            E-mail · agora
          </div>
          <p className="mt-[1.8cqw] text-[3.9cqw] leading-tight font-bold">Reparium</p>
          <p className="mt-[0.6cqw] text-[3.7cqw] leading-snug">Seu {aparelho} está pronto para retirada</p>
        </div>
      </TelaDoCelular>
    </div>
  );
}
