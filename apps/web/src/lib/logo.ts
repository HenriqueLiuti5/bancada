export function enderecoDaLogo(assinatura: string): string {
  return `/logos/${encodeURIComponent(assinatura)}`;
}
