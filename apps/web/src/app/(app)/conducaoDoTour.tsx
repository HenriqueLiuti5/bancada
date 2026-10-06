"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/componentes/icones";
import { botao, botaoDeIcone, juntar } from "@/componentes/ui/estilos";
import type { Lado, Parada } from "./roteiros";

export type Passo = Pick<Parada, "alvo" | "titulo" | "texto" | "lado">;

type Anel = { x: number; y: number; largura: number; altura: number; raio: number };

type Quadro = { anel: Anel | null; x: number; y: number; altura: number };

type Motor = {
  passo: Passo | null;
  elemento: Element | null;
  raio: number;
  lado: Lado | null;
  de: Quadro | null;
  atual: Quadro | null;
  inicio: number;
  saindo: boolean;
  semMovimento: boolean;
  areaSegura: number;
  escrito: string;
};

type Pecas = {
  anel: HTMLDivElement | null;
  popover: HTMLDivElement | null;
  recorte: HTMLDivElement | null;
  medida: HTMLDivElement | null;
};

type Referencias = Record<keyof Pecas, React.RefObject<HTMLDivElement | null>>;

type Direcao = "frente" | "tras" | null;

const DURACAO_DO_DESLIZE = 560;
const DURACAO_DA_SAIDA = 160;
const FOLGA_DO_ANEL = 6;
const DISTANCIA = 12;
const MARGEM = 16;
const LARGURA_DE_CELULAR = 640;
const LARGURA_COM_LATERAL = 1024;
const ALTURA_DO_CABECALHO = 64;
const LADOS: Lado[] = ["baixo", "cima", "direita", "esquerda"];
const CAMPOS_DE_TEXTO = ["INPUT", "TEXTAREA", "SELECT"];

export function elementoVisivel(alvo: string): Element | undefined {
  return Array.from(document.querySelectorAll(`[data-tour="${alvo}"]`)).find(
    (elemento) => elemento.getClientRects().length > 0,
  );
}

function tela() {
  const raiz = document.documentElement;
  return { largura: raiz.clientWidth, altura: raiz.clientHeight };
}

function emCelular(): boolean {
  return tela().largura < LARGURA_DE_CELULAR;
}

function topoLivre(): number {
  return (tela().largura < LARGURA_COM_LATERAL ? ALTURA_DO_CABECALHO : 0) + MARGEM;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(valor, maximo));
}

function curva(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const ponto = (s: number, p1: number, p2: number) =>
    3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s ** 2 * (1 - s) + s ** 3;
  return (t) => {
    let inferior = 0;
    let superior = 1;
    let s = t;
    for (let volta = 0; volta < 24; volta++) {
      const x = ponto(s, x1, x2);
      if (Math.abs(x - t) < 1e-5) break;
      if (x < t) inferior = s;
      else superior = s;
      s = (inferior + superior) / 2;
    }
    return ponto(s, y1, y2);
  };
}

const suavizar = curva(0.32, 0.72, 0, 1);

function interpolar(de: number, para: number, t: number): number {
  return de + (para - de) * t;
}

function editavel(alvo: EventTarget | null): boolean {
  return alvo instanceof HTMLElement && (alvo.isContentEditable || CAMPOS_DE_TEXTO.includes(alvo.tagName));
}

function medirAreaSegura(): number {
  const sonda = document.createElement("div");
  sonda.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden";
  document.body.appendChild(sonda);
  const altura = sonda.offsetHeight;
  sonda.remove();
  return altura;
}

function lerPecas(referencias: Referencias): Pecas {
  return {
    anel: referencias.anel.current,
    popover: referencias.popover.current,
    recorte: referencias.recorte.current,
    medida: referencias.medida.current,
  };
}

function raioDe(elemento: Element | null): number {
  return elemento ? parseFloat(getComputedStyle(elemento).borderTopLeftRadius) || 0 : 0;
}

function fixoNaTela(elemento: Element): boolean {
  for (let atual: Element | null = elemento; atual; atual = atual.parentElement) {
    const posicao = getComputedStyle(atual).position;
    if (posicao === "fixed" || posicao === "sticky") return true;
  }
  return false;
}

function anelEm(elemento: Element, raio: number): Anel {
  const caixa = elemento.getBoundingClientRect();
  const altura = caixa.height + FOLGA_DO_ANEL * 2;
  return {
    x: caixa.left - FOLGA_DO_ANEL,
    y: caixa.top - FOLGA_DO_ANEL,
    largura: caixa.width + FOLGA_DO_ANEL * 2,
    altura,
    raio: Math.min(raio + FOLGA_DO_ANEL, altura / 2),
  };
}

function escolherLado(anel: Anel, largura: number, altura: number, preferido?: Lado): Lado | null {
  const espaco = tela();
  const cabe: Record<Lado, boolean> = {
    baixo: espaco.altura - anel.y - anel.altura - DISTANCIA - MARGEM >= altura,
    cima: anel.y - DISTANCIA - topoLivre() >= altura,
    direita: espaco.largura - anel.x - anel.largura - DISTANCIA - MARGEM >= largura,
    esquerda: anel.x - DISTANCIA - MARGEM >= largura,
  };
  const ordem = preferido ? [preferido, ...LADOS] : LADOS;
  return ordem.find((lado) => cabe[lado]) ?? null;
}

function posicaoDoPopover(
  anel: Anel | null,
  lado: Lado | null,
  largura: number,
  altura: number,
  areaSegura: number,
) {
  const espaco = tela();
  const centro = (espaco.largura - largura) / 2;
  if (!anel) return { x: centro, y: Math.max(MARGEM, (espaco.altura - altura) / 2) };
  if (emCelular()) return { x: centro, y: espaco.altura - altura - MARGEM - areaSegura };

  const comecaNoAlvo = anel.largura >= largura || anel.x + anel.largura / 2 < espaco.largura / 2;
  const x = limitar(
    comecaNoAlvo ? anel.x : anel.x + anel.largura - largura,
    MARGEM,
    espaco.largura - largura - MARGEM,
  );
  const y = limitar(anel.y + (anel.altura - altura) / 2, topoLivre(), espaco.altura - altura - MARGEM);

  switch (lado) {
    case "baixo":
      return { x, y: anel.y + anel.altura + DISTANCIA };
    case "cima":
      return { x, y: anel.y - DISTANCIA - altura };
    case "direita":
      return { x: anel.x + anel.largura + DISTANCIA, y };
    case "esquerda":
      return { x: anel.x - DISTANCIA - largura, y };
    default:
      return { x, y: espaco.altura - altura - MARGEM };
  }
}

function rolarAte(elemento: Element, largura: number, altura: number, motor: Motor): Lado | null {
  const preferido = motor.passo?.lado;
  const anel = anelEm(elemento, 0);
  if (fixoNaTela(elemento)) return escolherLado(anel, largura, altura, preferido);

  const espaco = tela();
  const topo = topoLivre();
  let deslocamento = 0;

  if (emCelular()) {
    const base = espaco.altura - altura - MARGEM * 2 - motor.areaSegura;
    const livre = base - topo;
    if (anel.y < topo || anel.y + anel.altura > base) {
      deslocamento = anel.altura <= livre ? anel.y - topo - (livre - anel.altura) / 2 : anel.y - topo;
    }
  } else {
    const inteiro = anel.y >= topo && anel.y + anel.altura <= espaco.altura - MARGEM;
    if (!inteiro || !escolherLado(anel, largura, altura, preferido)) {
      const bloco = anel.altura + DISTANCIA + altura;
      const livre = espaco.altura - topo - MARGEM;
      deslocamento = bloco <= livre ? anel.y - topo - (livre - bloco) / 2 : anel.y - topo;
    }
  }

  const maximo = Math.max(0, document.documentElement.scrollHeight - espaco.altura);
  const destino = limitar(window.scrollY + deslocamento, 0, maximo);
  const percurso = destino - window.scrollY;
  if (Math.abs(percurso) >= 1) {
    window.scrollTo({ top: destino, behavior: motor.semMovimento ? "auto" : "smooth" });
  }
  return escolherLado({ ...anel, y: anel.y - percurso }, largura, altura, preferido);
}

function quadroDestino(motor: Motor, pecas: Pecas): Quadro | null {
  const { popover, medida } = pecas;
  if (!popover || !medida || !motor.passo) return null;

  const { alvo } = motor.passo;
  if (alvo && (!motor.elemento?.isConnected || motor.elemento.getClientRects().length === 0)) {
    motor.elemento = elementoVisivel(alvo) ?? null;
  }

  const anel = motor.elemento ? anelEm(motor.elemento, motor.raio) : null;
  const altura = medida.offsetHeight;
  const { x, y } = posicaoDoPopover(anel, motor.lado, popover.offsetWidth, altura, motor.areaSegura);
  return { anel, x, y, altura };
}

function misturar(de: Quadro, para: Quadro, t: number): Quadro {
  const anel =
    de.anel && para.anel
      ? {
          x: interpolar(de.anel.x, para.anel.x, t),
          y: interpolar(de.anel.y, para.anel.y, t),
          largura: interpolar(de.anel.largura, para.anel.largura, t),
          altura: interpolar(de.anel.altura, para.anel.altura, t),
          raio: interpolar(de.anel.raio, para.anel.raio, t),
        }
      : (para.anel ?? de.anel);
  return {
    anel,
    x: interpolar(de.x, para.x, t),
    y: interpolar(de.y, para.y, t),
    altura: interpolar(de.altura, para.altura, t),
  };
}

function desenhar(motor: Motor, pecas: Pecas, agora: number): void {
  const destino = quadroDestino(motor, pecas);
  if (!destino || !pecas.popover || !pecas.recorte) return;

  const progresso =
    motor.de && !motor.semMovimento ? Math.min(1, (agora - motor.inicio) / DURACAO_DO_DESLIZE) : 1;
  const quadro = motor.de && progresso < 1 ? misturar(motor.de, destino, suavizar(progresso)) : destino;
  if (progresso >= 1) motor.de = null;
  motor.atual = quadro;

  const visivel = Boolean(destino.anel) && !motor.saindo;
  const { anel } = quadro;
  const x = Math.round(quadro.x);
  const y = Math.round(quadro.y);
  const altura = Math.round(quadro.altura);
  const assinatura = anel
    ? `${x} ${y} ${altura} ${anel.x} ${anel.y} ${anel.largura} ${anel.altura} ${anel.raio} ${visivel}`
    : `${x} ${y} ${altura} ${visivel}`;
  if (assinatura === motor.escrito) return;
  motor.escrito = assinatura;

  if (pecas.anel) {
    if (anel) {
      pecas.anel.style.transform = `translate3d(${anel.x}px, ${anel.y}px, 0)`;
      pecas.anel.style.width = `${anel.largura}px`;
      pecas.anel.style.height = `${anel.altura}px`;
      pecas.anel.style.borderRadius = `${anel.raio}px`;
    }
    pecas.anel.style.opacity = visivel ? "1" : "0";
  }
  pecas.popover.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  pecas.recorte.style.height = `${altura}px`;
}

function Progresso({ total, atual }: { total: number; atual: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Passo {atual + 1} de {total}
      </span>
      {Array.from({ length: total }, (_, posicao) => (
        <span
          key={posicao}
          aria-hidden="true"
          className={juntar(
            "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
            posicao === atual ? "w-5" : "w-1.5",
            posicao <= atual ? "bg-destaque" : "bg-borda-forte",
          )}
        />
      ))}
    </div>
  );
}

type Props = { passos: Passo[]; aoFechar: () => void };

export function ConducaoDoTour({ passos, aoFechar }: Props) {
  const [indice, setIndice] = useState(0);
  const [direcao, setDirecao] = useState<Direcao>(null);
  const [saindo, setSaindo] = useState(false);
  const idDoTitulo = useId();
  const idDoTexto = useId();
  const anel = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const recorte = useRef<HTMLDivElement>(null);
  const medida = useRef<HTMLDivElement>(null);
  const motor = useRef<Motor>({
    passo: null,
    elemento: null,
    raio: 0,
    lado: null,
    de: null,
    atual: null,
    inicio: 0,
    saindo: false,
    semMovimento: false,
    areaSegura: 0,
    escrito: "",
  });

  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  useLayoutEffect(() => {
    motor.current.semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    motor.current.areaSegura = medirAreaSegura();
  }, []);

  useLayoutEffect(() => {
    const atual = motor.current;
    const pecas = lerPecas({ anel, popover, recorte, medida });
    const largura = pecas.popover?.offsetWidth ?? 0;
    const altura = pecas.medida?.offsetHeight ?? 0;
    atual.passo = passo;
    atual.elemento = passo.alvo ? (elementoVisivel(passo.alvo) ?? null) : null;
    atual.raio = raioDe(atual.elemento);
    atual.de = atual.atual;
    atual.inicio = performance.now();
    atual.lado = atual.elemento ? rolarAte(atual.elemento, largura, altura, atual) : null;
    desenhar(atual, pecas, atual.inicio);
  }, [passo]);

  useEffect(() => {
    const pecas = lerPecas({ anel, popover, recorte, medida });
    let quadro = requestAnimationFrame(function laco(agora) {
      desenhar(motor.current, pecas, agora);
      quadro = requestAnimationFrame(laco);
    });

    function aoRedimensionar() {
      const atual = motor.current;
      if (!atual.elemento || !pecas.popover || !pecas.medida) return;
      atual.lado = escolherLado(
        anelEm(atual.elemento, 0),
        pecas.popover.offsetWidth,
        pecas.medida.offsetHeight,
        atual.passo?.lado,
      );
    }

    window.addEventListener("resize", aoRedimensionar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    popover.current?.focus({ preventScroll: true });
    return () => {
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    motor.current.saindo = saindo;
    if (!saindo) return;
    const espera = window.setTimeout(aoFechar, motor.current.semMovimento ? 0 : DURACAO_DA_SAIDA);
    return () => window.clearTimeout(espera);
  }, [saindo, aoFechar]);

  useEffect(() => {
    function teclar(evento: KeyboardEvent) {
      if (evento.defaultPrevented || editavel(evento.target)) return;
      if (evento.key === "Escape") {
        setSaindo(true);
      } else if (evento.key === "ArrowRight" && indice < passos.length - 1) {
        setDirecao("frente");
        setIndice(indice + 1);
      } else if (evento.key === "ArrowLeft" && indice > 0) {
        setDirecao("tras");
        setIndice(indice - 1);
      }
    }

    document.addEventListener("keydown", teclar);
    return () => document.removeEventListener("keydown", teclar);
  }, [indice, passos.length]);

  function avancar() {
    if (ultimo) {
      setSaindo(true);
      return;
    }
    setDirecao("frente");
    setIndice(indice + 1);
  }

  function voltar() {
    setDirecao("tras");
    setIndice(indice - 1);
  }

  return createPortal(
    <>
      <div
        ref={anel}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-50 border-2 border-anel opacity-0 transition-opacity duration-200"
      />
      <div
        ref={popover}
        role="dialog"
        tabIndex={-1}
        aria-labelledby={idDoTitulo}
        aria-describedby={idDoTexto}
        className="fixed top-0 left-0 z-50 w-[min(22rem,calc(100vw-2rem))] outline-none"
      >
        <div
          className={juntar(
            "relative overflow-hidden rounded-2xl border border-borda bg-superficie text-texto shadow-elevada motion-reduce:animate-none",
            saindo ? "animate-sumir" : "animate-surgir",
          )}
        >
          <div ref={recorte} className="overflow-hidden">
            <div ref={medida} className="p-5">
              <div aria-live="polite">
                <div
                  key={indice}
                  className={juntar(
                    "pr-8 motion-reduce:animate-none",
                    direcao === "frente" && "animate-avancar",
                    direcao === "tras" && "animate-voltar",
                  )}
                >
                  <p id={idDoTitulo} className="text-[15px] leading-snug font-semibold">
                    {passo.titulo}
                  </p>
                  <p id={idDoTexto} className="mt-1.5 text-sm leading-relaxed text-texto-suave">
                    {passo.texto}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                {passos.length > 1 ? <Progresso total={passos.length} atual={indice} /> : <span />}
                <div className="flex items-center gap-1.5">
                  {indice > 0 && (
                    <button type="button" onClick={voltar} className={botao("fantasma", "sm")}>
                      Voltar
                    </button>
                  )}
                  <button type="button" onClick={avancar} className={botao("primario", "sm")}>
                    {ultimo ? "Entendi" : "Próximo"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSaindo(true)}
            aria-label="Pular o tour"
            title="Pular o tour"
            className={juntar(botaoDeIcone, "absolute top-3 right-3")}
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
