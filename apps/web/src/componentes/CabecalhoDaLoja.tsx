import Image from "next/image";
import { StorefrontIcon } from "@/componentes/icones";
import { enderecoDaLogo } from "@/lib/logo";
import type { Logo } from "@/lib/tipos";

type Props = { nome: string; detalhe: string; logo: Logo | null };

export function CabecalhoDaLoja({ nome, detalhe, logo }: Props) {
  const identificacao = (
    <div className="min-w-0">
      <p className="truncate text-[15px] font-bold">{nome}</p>
      <p className="text-[13px] text-texto-apagado">{detalhe}</p>
    </div>
  );

  if (!logo) {
    return (
      <div className="flex items-center gap-3">
        <StorefrontIcon size={28} className="shrink-0 text-icone" />
        {identificacao}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Image
        src={enderecoDaLogo(logo.assinatura)}
        alt=""
        width={logo.largura}
        height={logo.altura}
        unoptimized
        loading="eager"
        className="h-14 w-auto max-w-56 object-contain object-left escuro:rounded-lg escuro:bg-white escuro:p-1.5"
      />
      {identificacao}
    </div>
  );
}
