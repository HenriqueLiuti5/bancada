import Link from "next/link";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";
import { botao, juntar } from "@/componentes/ui/estilos";
import { conteiner } from "./secao";

const SECOES = [
  { href: "#recursos", rotulo: "Recursos" },
  { href: "#para-quem", rotulo: "Para quem" },
  { href: "#preco", rotulo: "Preço" },
  { href: "#duvidas", rotulo: "Dúvidas" },
];

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-superficie">
      <div className={juntar(conteiner, "flex h-16 items-center justify-between gap-4")}>
        <Link href="/" className="flex items-center gap-2.5 rounded-full">
          <Marca />
          <NomeDaMarca />
        </Link>

        <nav aria-label="Seções da página" className="hidden items-center gap-1 md:flex">
          {SECOES.map(({ href, rotulo }) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-texto-suave transition-colors duration-150 hover:bg-realce hover:text-texto"
            >
              {rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/login" className={botao("fantasma", "sm")}>
            Entrar
          </Link>
          <Link href="/cadastro" className={botao("primario", "sm")}>
            Testar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
