"use client";

import { usePathname } from "next/navigation";

export function ForaDa({ caminho, children }: { caminho: string; children: React.ReactNode }) {
  const atual = usePathname();
  if (atual === caminho || atual.startsWith(`${caminho}/`)) return null;
  return children;
}
