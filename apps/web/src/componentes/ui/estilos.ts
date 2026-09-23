import { twMerge } from "tailwind-merge";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "sm" | "md";

const BASE_DO_BOTAO =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-borda-forte focus-visible:ring-offset-2 focus-visible:ring-offset-fundo disabled:pointer-events-none disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-primario text-primario-texto shadow-sutil hover:bg-primario-hover",
  secundario: "border border-borda bg-superficie text-texto shadow-sutil hover:bg-realce",
  fantasma: "text-texto-suave hover:bg-realce hover:text-texto",
  perigo: "border border-borda bg-superficie text-perigo-forte shadow-sutil hover:bg-realce",
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

export function botao(variante: Variante = "secundario", tamanho: Tamanho = "md"): string {
  return `${BASE_DO_BOTAO} ${VARIANTES[variante]} ${TAMANHOS[tamanho]}`;
}

const BASE_DO_CAMPO =
  "w-full rounded-lg border border-borda bg-superficie px-3 text-sm text-texto shadow-sutil outline-none transition-colors hover:border-borda-forte focus:border-texto-apagado focus:ring-2 focus:ring-realce disabled:cursor-not-allowed disabled:opacity-60";

export const campo = `${BASE_DO_CAMPO} h-9`;

export const seletor = `${BASE_DO_CAMPO} seletor h-9`;

export const areaDeTexto = `${BASE_DO_CAMPO} min-h-20 py-2 leading-relaxed`;

export function juntar(...classes: Array<string | false | null | undefined>): string {
  return twMerge(...classes);
}
