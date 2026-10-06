import { notFound } from "next/navigation";
import { MenuDaConta } from "@/componentes/MenuDaConta";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";
import { usuarioAtual } from "@/lib/usuario";

export default async function LayoutDaPlataforma({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario.da_plataforma) notFound();

  const nome = usuario.first_name || usuario.username;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-lateral text-lateral-texto">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 pr-2 pl-4 sm:pr-4 sm:pl-6 lg:pr-8 lg:pl-10">
          <Marca />
          <p className="flex min-w-0 flex-1 items-center gap-2.5 truncate">
            <NomeDaMarca className="text-base" />
            <span className="rounded-full bg-lateral-realce px-2.5 py-0.5 text-xs font-semibold text-lateral-texto-suave">
              Plataforma
            </span>
          </p>
          <span className="hidden text-[13px] font-medium text-lateral-texto-suave sm:inline">
            {nome}
          </span>
          <MenuDaConta nome={nome} detalhe="Conta da plataforma" lugar="cabecalho" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
