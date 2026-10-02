const MEGABYTE = 1024 * 1024;
const FOLGA_PARA_O_RESTO_DO_FORMULARIO_EM_BYTES = MEGABYTE;

export const TAMANHO_MAXIMO_DA_FOTO_EM_MB = 10;
export const TAMANHO_MAXIMO_DO_ENVIO_DE_FOTO_EM_BYTES =
  TAMANHO_MAXIMO_DA_FOTO_EM_MB * MEGABYTE + FOLGA_PARA_O_RESTO_DO_FORMULARIO_EM_BYTES;

export function fotoPassaDoTamanho(arquivo: File): boolean {
  return arquivo.size > TAMANHO_MAXIMO_DA_FOTO_EM_MB * MEGABYTE;
}

export function enderecoDaFoto(assinatura: string): string {
  return `/fotos/${encodeURIComponent(assinatura)}`;
}
