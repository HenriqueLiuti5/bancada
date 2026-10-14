import { WhatsappLogoIcon } from "@/componentes/icones";

export function WhatsAppFlutuante({ link }: { link: string }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      title="Dúvidas? Fale com a gente no WhatsApp"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex h-14 items-center gap-2.5 rounded-full bg-primario px-4 text-[15px] font-semibold text-primario-texto shadow-elevada transition-colors duration-150 hover:bg-primario-hover sm:right-6 sm:bottom-6 sm:px-5"
    >
      <WhatsappLogoIcon size={24} />
      <span className="sr-only sm:not-sr-only">Dúvidas? Fale no WhatsApp</span>
    </a>
  );
}
