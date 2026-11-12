"use client";

import { useEffect, useRef } from "react";

// Com o mouse, o que tem data-profundidade, o celular da abertura, anda alguns pixels para o lado do
// ponteiro, como se estivesse mais perto de quem olha que o notebook, que fica parado. O deslocamento
// é só em 2D e em pixels inteiros da tela: com perspectiva, giro ou meio pixel de deslocamento, o
// Chrome desenha as capturas borradas. No toque e para quem pede menos movimento, nada se mexe. O
// estilo vai direto no elemento, sem render do React.
const DESLOCAMENTO_X = 14;
const DESLOCAMENTO_Y = 8;

export function Profundidade({ children, className }: { children: React.ReactNode; className?: string }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = raiz.current;
    const area = elemento?.closest("section");
    if (
      !elemento ||
      !area ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const perto = [...elemento.querySelectorAll<HTMLElement>("[data-profundidade]")];

    let alvoX = 0;
    let alvoY = 0;
    let x = 0;
    let y = 0;
    let quadro = 0;

    const emPixelsDaTela = (valor: number) => Math.round(valor * devicePixelRatio) / devicePixelRatio;

    const desenhar = () => {
      x += (alvoX - x) * 0.1;
      y += (alvoY - y) * 0.1;
      const parado = Math.abs(alvoX - x) < 0.002 && Math.abs(alvoY - y) < 0.002;
      if (parado) {
        x = alvoX;
        y = alvoY;
      }
      const dx = emPixelsDaTela(x * DESLOCAMENTO_X);
      const dy = emPixelsDaTela(y * DESLOCAMENTO_Y);
      const deslocamento = dx || dy ? `${dx}px ${dy}px` : "";
      perto.forEach((camada) => (camada.style.translate = deslocamento));
      quadro = parado ? 0 : requestAnimationFrame(desenhar);
    };
    const pedirQuadro = () => {
      if (!quadro) quadro = requestAnimationFrame(desenhar);
    };
    const mover = (evento: PointerEvent) => {
      const caixa = elemento.getBoundingClientRect();
      alvoX = Math.max(-1, Math.min(1, (evento.clientX - (caixa.left + caixa.width / 2)) / (caixa.width / 2)));
      alvoY = Math.max(-1, Math.min(1, (evento.clientY - (caixa.top + caixa.height / 2)) / (caixa.height / 2)));
      pedirQuadro();
    };
    const sair = () => {
      alvoX = 0;
      alvoY = 0;
      pedirQuadro();
    };

    area.addEventListener("pointermove", mover, { passive: true });
    area.addEventListener("pointerleave", sair);
    return () => {
      area.removeEventListener("pointermove", mover);
      area.removeEventListener("pointerleave", sair);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <div ref={raiz} className={className}>
      {children}
    </div>
  );
}
