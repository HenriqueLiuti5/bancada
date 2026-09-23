export function enderecoDaFoto(assinatura: string): string {
  return `/fotos/${encodeURIComponent(assinatura)}`;
}
