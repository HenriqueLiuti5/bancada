"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MenuDaConta } from "@/componentes/MenuDaConta";
import {
  ClipboardTextIcon,
  CreditCardIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SquaresFourIcon,
  StorefrontIcon,
  UsersIcon,
  type Icon,
} from "@/componentes/icones";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";
import { botao, focoNaLateral, itemDaLateral, juntar, rotuloDaLateral } from "@/componentes/ui/estilos";
import { guardarLateral } from "@/lib/lateral";
import { MenuDeAjuda } from "./menuDeAjuda";

type Item = { href: string; rotulo: string; curto: string; icone: Icon; soDono?: boolean };

const ITENS: Item[] = [
  { href: "/painel", rotulo: "Painel", curto: "Painel", icone: SquaresFourIcon },
  { href: "/ordens", rotulo: "Ordens de serviço", curto: "Ordens", icone: ClipboardTextIcon },
  { href: "/equipe", rotulo: "Equipe", curto: "Equipe", icone: UsersIcon, soDono: true },
  { href: "/assistencia", rotulo: "Assistência", curto: "Assistência", icone: StorefrontIcon, soDono: true },
  { href: "/assinatura", rotulo: "Assinatura", curto: "Assinatura", icone: CreditCardIcon, soDono: true },
];

const COLUNAS_DA_BARRA_INFERIOR: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

const BOTAO_DA_LATERAL =
  "flex shrink-0 items-center justify-center rounded-xl text-lateral-texto-suave transition-colors duration-150 hover:bg-lateral-hover hover:text-lateral-texto";

type Dica = { texto: string; topo: number };

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
  recolhidaDeInicio: boolean;
};

export function BarraLateral({
  nome,
  papel,
  assistencia,
  eDono,
  linkDoSuporte,
  podeReabrirPrimeirosPassos,
  recolhidaDeInicio,
}: Props) {
  const caminho = usePathname();
  const [recolhida, setRecolhida] = useState(recolhidaDeInicio);
  const [dica, setDica] = useState<Dica | null>(null);
  const alternador = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);
  const itens = ITENS.filter((item) => !item.soDono || eDono);
  const detalheDaConta = assistencia ? `${papel} · ${assistencia}` : papel;

  useEffect(() => {
    if (!devolverFoco.current) return;
    devolverFoco.current = false;
    alternador.current?.focus();
  }, [recolhida]);

  function alternar() {
    devolverFoco.current = document.activeElement === alternador.current;
    setDica(null);
    setRecolhida(!recolhida);
    guardarLateral(!recolhida);
  }

  function mostrarDica(evento: React.SyntheticEvent) {
    if (!recolhida) return;
    const alvo = (evento.target as Element).closest<HTMLElement>("[data-dica]");
    if (!alvo || (evento.type === "focus" && !alvo.matches(":focus-visible"))) {
      setDica(null);
      return;
    }
    const caixa = alvo.getBoundingClientRect();
    setDica({ texto: alvo.dataset.dica ?? "", topo: caixa.top + caixa.height / 2 });
  }

  function esconderDica() {
    setDica(null);
  }

  return (
    <>
      <aside
        onPointerOver={mostrarDica}
        onPointerLeave={esconderDica}
        onPointerDown={esconderDica}
        onFocus={mostrarDica}
        onBlur={esconderDica}
        className={juntar(
          "hidden shrink-0 bg-lateral text-lateral-texto transition-[width] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col",
          recolhida ? "lg:w-18" : "lg:w-64",
        )}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 overflow-hidden px-5">
          {recolhida ? (
            <button
              ref={alternador}
              type="button"
              onClick={alternar}
              aria-label="Expandir menu"
              data-dica="Expandir menu"
              className={juntar("group/marca relative shrink-0 rounded-xl", focoNaLateral)}
            >
              <Marca className="transition-opacity duration-150 group-hover/marca:opacity-0 group-focus-visible/marca:opacity-0" />
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-lateral-realce text-lateral-texto opacity-0 transition-opacity duration-150 group-hover/marca:opacity-100 group-focus-visible/marca:opacity-100">
                <SidebarSimpleIcon size={18} />
              </span>
            </button>
          ) : (
            <>
              <Marca />
              <div className="min-w-0 flex-1 animate-aparecer">
                <NomeDaMarca className="block text-base" />
                {assistencia && (
                  <p className="mt-1 truncate text-xs text-lateral-texto-suave">{assistencia}</p>
                )}
              </div>
              <button
                ref={alternador}
                type="button"
                onClick={alternar}
                aria-label="Recolher menu"
                title="Recolher menu"
                className={juntar(BOTAO_DA_LATERAL, "size-8 animate-aparecer", focoNaLateral)}
              >
                <SidebarSimpleIcon size={18} />
              </button>
            </>
          )}
        </div>

        <div className="px-3">
          <Link
            href="/ordens/nova"
            data-dica="Nova ordem de serviço"
            className={juntar(
              botao("primario"),
              "w-full justify-start gap-3 overflow-hidden px-3.5 sm:px-3.5",
              focoNaLateral,
            )}
          >
            <PlusIcon size={20} className="shrink-0" />
            <span className={rotuloDaLateral(recolhida)}>Nova ordem de serviço</span>
          </Link>
        </div>

        <nav aria-label="Principal" className="mt-6 flex-1 space-y-1 px-3">
          {itens.map(({ href, rotulo, icone: Icone }) => {
            const ativo = estaAtivo(caminho, href);
            return (
              <Link
                key={href}
                href={href}
                data-dica={rotulo}
                aria-current={ativo ? "page" : undefined}
                className={juntar(
                  itemDaLateral,
                  focoNaLateral,
                  ativo
                    ? "bg-lateral-realce font-semibold text-lateral-texto"
                    : "text-lateral-texto-suave hover:bg-lateral-hover hover:text-lateral-texto",
                )}
              >
                <Icone
                  size={20}
                  weight={ativo ? "fill" : "regular"}
                  className={juntar("shrink-0", ativo && "text-lateral-icone")}
                />
                <span className={rotuloDaLateral(recolhida)}>{rotulo}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-lateral-borda px-3 py-3">
          <MenuDeAjuda
            lugar="barra-lateral"
            recolhida={recolhida}
            linkDoSuporte={linkDoSuporte}
            podeReabrirPrimeirosPassos={podeReabrirPrimeirosPassos}
          />
          <MenuDaConta
            nome={nome}
            detalhe={detalheDaConta}
            lugar="barra-lateral"
            recolhida={recolhida}
          />
        </div>
      </aside>

      {recolhida && dica && (
        <span
          aria-hidden="true"
          style={{ top: dica.topo }}
          className="pointer-events-none fixed left-20 z-40 hidden -translate-y-1/2 animate-dica rounded-lg border border-lateral-borda bg-lateral px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-lateral-texto shadow-elevada lg:block"
        >
          {dica.texto}
        </span>
      )}

      <header className="sticky top-0 z-20 bg-lateral text-lateral-texto lg:hidden">
        <div className="flex h-16 items-center gap-2 pr-3 pl-4">
          <Marca />
          <p className="ml-1 min-w-0 flex-1 truncate text-[15px] font-bold">
            {assistencia || "Bancada"}
          </p>
          <Link
            href="/ordens/nova"
            title="Nova ordem de serviço"
            data-tour="nova-ordem"
            className={juntar(botao("primario", "sm"), "h-10 px-4", focoNaLateral)}
          >
            <PlusIcon size={17} />
            Nova
            <span className="sr-only"> ordem de serviço</span>
          </Link>
          <MenuDeAjuda
            lugar="cabecalho"
            linkDoSuporte={linkDoSuporte}
            podeReabrirPrimeirosPassos={podeReabrirPrimeirosPassos}
          />
          <MenuDaConta nome={nome} detalhe={detalheDaConta} lugar="cabecalho" />
        </div>
      </header>

      <nav
        aria-label="Principal"
        className={juntar(
          "fixed inset-x-0 bottom-0 z-20 grid border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden",
          COLUNAS_DA_BARRA_INFERIOR[itens.length],
        )}
      >
        {itens.map(({ href, curto, icone: Icone }) => {
          const ativo = estaAtivo(caminho, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={juntar(
                "flex flex-col items-center gap-1 px-0.5 pt-2 pb-2 text-[11px] transition-colors duration-150",
                ativo ? "font-semibold text-destaque" : "font-medium text-texto-apagado hover:text-texto",
              )}
            >
              <span className="flex h-8 items-center justify-center">
                <Icone size={24} weight={ativo ? "fill" : "regular"} />
              </span>
              <span className="max-w-full truncate">{curto}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
