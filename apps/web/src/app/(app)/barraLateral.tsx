"use client";

import {
  ClipboardList,
  LayoutGrid,
  LogOut,
  Plus,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/componentes/ui/Avatar";
import { Marca } from "@/componentes/ui/Marca";
import { botao, juntar } from "@/componentes/ui/estilos";
import { sair } from "../acoes";
import { MenuDeAjuda } from "./menuDeAjuda";

type Item = { href: string; rotulo: string; icone: LucideIcon; soDono?: boolean };

const ITENS: Item[] = [
  { href: "/painel", rotulo: "Painel", icone: LayoutGrid },
  { href: "/ordens", rotulo: "Ordens de serviço", icone: ClipboardList },
  { href: "/equipe", rotulo: "Equipe", icone: Users, soDono: true },
  { href: "/assistencia", rotulo: "Assistência", icone: Store, soDono: true },
];

function estaAtivo(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

type Props = {
  nome: string;
  papel: string;
  assistencia: string;
  eDono: boolean;
  linkDoSuporte: string | null;
  podeReabrirPrimeirosPassos: boolean;
};

export function BarraLateral({
  nome,
  papel,
  assistencia,
  eDono,
  linkDoSuporte,
  podeReabrirPrimeirosPassos,
}: Props) {
  const caminho = usePathname();
  const itens = ITENS.filter((item) => !item.soDono || eDono);

  return (
    <>
      <aside className="hidden border-r border-borda lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <Marca />
          <div className="min-w-0">
            <p className="text-sm leading-tight font-semibold">Bancada</p>
            <p className="truncate text-xs text-texto-suave">{assistencia}</p>
          </div>
        </div>

        <div className="px-3">
          <Link href="/ordens/nova" className={juntar(botao("secundario", "sm"), "w-full")}>
            <Plus size={15} strokeWidth={2} />
            Nova ordem de serviço
          </Link>
        </div>

        <nav className="mt-5 flex-1 space-y-0.5 px-3">
          {itens.map(({ href, rotulo, icone: Icone }) => {
            const ativo = estaAtivo(caminho, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={
                  ativo
                    ? "flex items-center gap-2.5 rounded-lg bg-realce px-2.5 py-1.5 text-sm font-medium text-texto"
                    : "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-texto-suave transition-colors hover:bg-realce hover:text-texto"
                }
              >
                <Icone size={16} strokeWidth={1.75} />
                {rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <MenuDeAjuda
            lugar="barra-lateral"
            linkDoSuporte={linkDoSuporte}
            podeReabrirPrimeirosPassos={podeReabrirPrimeirosPassos}
          />
        </div>

        <div className="flex items-center gap-2.5 border-t border-borda px-4 py-3">
          <Avatar nome={nome} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{nome}</p>
            <p className="truncate text-xs text-texto-suave">{papel}</p>
          </div>
          <form action={sair}>
            <button type="submit" title="Sair" className={botao("fantasma", "sm")}>
              <LogOut size={15} strokeWidth={1.75} />
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-borda bg-fundo lg:hidden">
        <div className="flex items-center gap-2.5 px-4 pt-3">
          <Marca />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{assistencia || "Bancada"}</p>
          <Link href="/ordens/nova" title="Nova ordem de serviço" className={botao("secundario", "sm")}>
            <Plus size={15} strokeWidth={2} />
            <span className="sr-only">Nova ordem de serviço</span>
          </Link>
          <MenuDeAjuda
            lugar="cabecalho"
            linkDoSuporte={linkDoSuporte}
            podeReabrirPrimeirosPassos={podeReabrirPrimeirosPassos}
          />
          <form action={sair}>
            <button type="submit" title="Sair" className={botao("fantasma", "sm")}>
              <LogOut size={15} strokeWidth={1.75} />
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </div>

        <nav className="flex gap-5 overflow-x-auto px-4">
          {itens.map(({ href, rotulo }) => {
            const ativo = estaAtivo(caminho, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={
                  ativo
                    ? "border-b-2 border-texto py-2.5 text-sm font-medium whitespace-nowrap text-texto"
                    : "border-b-2 border-transparent py-2.5 text-sm whitespace-nowrap text-texto-suave hover:text-texto"
                }
              >
                {rotulo}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
