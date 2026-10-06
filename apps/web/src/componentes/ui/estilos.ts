import { twMerge } from "tailwind-merge";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "sm" | "md";

const BASE_DO_BOTAO =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-primario text-primario-texto shadow-suave hover:bg-primario-hover",
  secundario:
    "border border-borda-forte bg-superficie text-texto shadow-suave hover:bg-realce",
  fantasma: "text-texto-suave hover:bg-realce hover:text-texto",
  perigo:
    "border border-borda-forte bg-superficie text-perigo shadow-suave hover:border-perigo/40 hover:bg-perigo-suave",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-9 px-3.5 text-sm sm:h-8 sm:px-3 sm:text-[13px]",
  md: "h-11 px-5 text-[15px] sm:h-10 sm:px-4 sm:text-sm",
};

export function botao(variante: Variante = "secundario", tamanho: Tamanho = "md"): string {
  return `${BASE_DO_BOTAO} ${VARIANTES[variante]} ${TAMANHOS[tamanho]}`;
}

export const botaoDeIcone =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-texto-apagado transition-colors duration-150 hover:bg-realce hover:text-texto disabled:pointer-events-none disabled:opacity-50 sm:size-8";

export const focoNaLateral = "focus-visible:outline-lateral-anel";

export const itemDaLateral =
  "flex w-full items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150";

export function rotuloDaLateral(recolhida: boolean, classes = "truncate"): string {
  return juntar(
    classes,
    "min-w-0 transition-opacity motion-reduce:transition-none",
    recolhida ? "opacity-0 duration-100" : "opacity-100 duration-200 delay-75",
  );
}

const BASE_DO_CAMPO =
  "w-full rounded-xl border border-borda-do-campo bg-campo px-3.5 text-base text-texto shadow-suave outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-anel focus:ring-4 focus:ring-anel/15 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

export const campo = `${BASE_DO_CAMPO} h-11 sm:h-10`;

export const seletor = `${BASE_DO_CAMPO} seletor h-11 sm:h-10`;

export const areaDeTexto = `${BASE_DO_CAMPO} min-h-24 py-2.5 leading-relaxed`;

export const caixaDeMarcar = "size-4 shrink-0 cursor-pointer rounded accent-primario";

export const link =
  "font-semibold text-destaque underline-offset-4 transition-colors hover:underline";

export function juntar(...classes: Array<string | false | null | undefined>): string {
  return twMerge(...classes);
}
