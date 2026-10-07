import Link from "next/link";
import { ClipboardTextIcon, DeviceMobileIcon, FileTextIcon } from "@/componentes/icones";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";
import { buscarOfertaSeDisponivel, testeGratis } from "@/lib/oferta";

const VANTAGENS = [
  { icone: ClipboardTextIcon, texto: "Abra a ordem de serviço no balcão em menos de um minuto." },
  { icone: DeviceMobileIcon, texto: "O cliente acompanha o reparo pelo celular, sem criar conta." },
  { icone: FileTextIcon, texto: "Comprovante de entrada e recibo com garantia em PDF." },
];

type Props = {
  titulo: string;
  descricao?: React.ReactNode;
  rodape?: React.ReactNode;
  larga?: boolean;
  children: React.ReactNode;
};

async function PainelDaMarca() {
  const oferta = await buscarOfertaSeDisponivel();

  return (
    <aside className="hidden bg-lateral text-lateral-texto lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <Link
        href="/"
        className="flex w-fit items-center gap-3 rounded-full focus-visible:outline-lateral-anel"
      >
        <Marca tamanho="md" />
        <NomeDaMarca className="text-xl" />
      </Link>

      <div className="max-w-md space-y-10">
        <div className="space-y-4">
          <p className="text-4xl leading-tight font-bold tracking-tight">
            A bancada da sua assistência, organizada.
          </p>
          <p className="text-base leading-relaxed text-lateral-texto-suave">
            Ordens de serviço, orçamentos e fotos num lugar só, com o cliente acompanhando o reparo
            pelo celular.
          </p>
        </div>

        <ul className="space-y-5">
          {VANTAGENS.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-center gap-4">
              <Icone size={26} className="shrink-0 text-lateral-icone" />
              <span className="text-[15px] leading-snug">{texto}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-lateral-texto-suave">
        {testeGratis(oferta)}, sem cartão de crédito.
      </p>
    </aside>
  );
}

export function TelaDeAcesso({ titulo, descricao, rodape, larga = false, children }: Props) {
  return (
    <div className="min-h-screen bg-superficie lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <PainelDaMarca />

      <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className={`w-full space-y-8 ${larga ? "max-w-md" : "max-w-sm"}`}>
          <header className="space-y-6">
            <Link href="/" className="flex w-fit items-center gap-3 rounded-full lg:hidden">
              <Marca tamanho="md" />
              <NomeDaMarca className="text-xl" />
            </Link>
            <div className="space-y-2">
              <h1 className="text-[28px] leading-tight font-bold tracking-tight">{titulo}</h1>
              {descricao && <p className="text-[15px] text-texto-apagado">{descricao}</p>}
            </div>
          </header>

          {children}

          {rodape && (
            <div className="border-t border-borda pt-6 text-sm text-texto-apagado">{rodape}</div>
          )}
        </div>
      </main>
    </div>
  );
}
