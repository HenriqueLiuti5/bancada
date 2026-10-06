export const COOKIE_DA_LATERAL = "lateral";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export function lateralRecolhida(valor: string | undefined): boolean {
  return valor === "recolhida";
}

export function guardarLateral(recolhida: boolean): void {
  document.cookie = recolhida
    ? `${COOKIE_DA_LATERAL}=recolhida; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; samesite=lax`
    : `${COOKIE_DA_LATERAL}=; path=/; max-age=0; samesite=lax`;
}
