"use client";

import { WhatsappLogoIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { registrarLinkCompartilhado } from "../../acoes";

type Props = { id: number; link: string; rotulo: string; tamanho?: "sm" | "md" };

export function AvisoNoWhatsApp({ id, link, rotulo, tamanho = "md" }: Props) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      onClick={() => void registrarLinkCompartilhado(id, "whatsapp").catch(() => undefined)}
      className={juntar(botao("secundario", tamanho), "max-sm:w-full")}
    >
      <WhatsappLogoIcon size={tamanho === "sm" ? 15 : 17} />
      {rotulo}
    </a>
  );
}
