import Link from "next/link";
import { WhatsappLogoIcon } from "@/componentes/icones";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";
import { juntar } from "@/componentes/ui/estilos";
import { hojeEmIso } from "@/lib/datas";
import { conteiner } from "./secao";

const COLUNAS = [
  {
    titulo: "Produto",
    links: [
      { href: "#recursos", rotulo: "Recursos" },
      { href: "#preco", rotulo: "Preço" },
      { href: "#duvidas", rotulo: "Dúvidas" },
      { href: "/demonstracao", rotulo: "Demonstração" },
    ],
  },
  {
    titulo: "Conta",
    links: [
      { href: "/cadastro", rotulo: "Testar grátis" },
      { href: "/login", rotulo: "Entrar" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { href: "/termos", rotulo: "Termos de uso" },
      { href: "/privacidade", rotulo: "Política de privacidade" },
    ],
  },
];

const LINK_DO_RODAPE =
  "rounded text-sm text-texto-suave transition-colors duration-150 hover:text-texto";

export function Rodape({ whatsapp }: { whatsapp: string | null }) {
  return (
    <footer className="border-t border-borda bg-superficie">
      <div className={juntar(conteiner, "py-14")}>
        <div className="grid gap-10 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="space-y-4 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-full">
              <Marca />
              <NomeDaMarca />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-texto-apagado">
              Sistema de ordem de serviço para assistência técnica de celular.
            </p>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className={juntar(LINK_DO_RODAPE, "inline-flex items-center gap-2 font-medium")}
              >
                <WhatsappLogoIcon size={18} className="text-icone" />
                Fale com a gente no WhatsApp
              </a>
            )}
          </div>

          {COLUNAS.map(({ titulo, links }) => (
            <nav key={titulo} aria-label={titulo}>
              <p className="text-sm font-semibold">{titulo}</p>
              <ul className="mt-4 space-y-3">
                {links.map(({ href, rotulo }) => (
                  <li key={href}>
                    {href.startsWith("#") ? (
                      <a href={href} className={LINK_DO_RODAPE}>
                        {rotulo}
                      </a>
                    ) : (
                      <Link href={href} className={LINK_DO_RODAPE}>
                        {rotulo}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-borda pt-6 text-[13px] text-texto-apagado">
          © {hojeEmIso().slice(0, 4)} Bancada
        </p>
      </div>
    </footer>
  );
}
