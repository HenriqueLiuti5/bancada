export const COOKIE_DO_TEMA = "tema";

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export type PreferenciaDeTema = "claro" | "escuro" | "automatico";

type PreferenciaGuardada = Exclude<PreferenciaDeTema, "claro">;

export function lerTema(valor: string | undefined): PreferenciaGuardada | undefined {
  return valor === "escuro" || valor === "automatico" ? valor : undefined;
}

export function preferenciaAtual(): PreferenciaDeTema {
  return lerTema(document.documentElement.dataset.tema) ?? "claro";
}

export function aplicarTema(preferencia: PreferenciaDeTema): void {
  const raiz = document.documentElement;
  if (preferencia === "claro") {
    delete raiz.dataset.tema;
    document.cookie = `${COOKIE_DO_TEMA}=; path=/; max-age=0; samesite=lax`;
    return;
  }
  raiz.dataset.tema = preferencia;
  document.cookie = `${COOKIE_DO_TEMA}=${preferencia}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; samesite=lax`;
}
