import { LogOut } from "lucide-react";
import { notFound } from "next/navigation";
import { Avatar } from "@/componentes/ui/Avatar";
import { Marca } from "@/componentes/ui/Marca";
import { botao } from "@/componentes/ui/estilos";
import { usuarioAtual } from "@/lib/usuario";
import { sair } from "../acoes";

export default async function LayoutDaPlataforma({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario.da_plataforma) notFound();

  const nome = usuario.first_name || usuario.username;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-borda bg-fundo">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3 sm:px-6 lg:px-10">
          <Marca />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            Bancada <span className="font-normal text-texto-suave">· Plataforma</span>
          </p>
          <Avatar nome={nome} />
          <span className="hidden text-[13px] font-medium sm:inline">{nome}</span>
          <form action={sair}>
            <button type="submit" title="Sair" className={botao("fantasma", "sm")}>
              <LogOut size={15} strokeWidth={1.75} />
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
