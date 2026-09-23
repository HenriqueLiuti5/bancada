import Link from "next/link";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { sair } from "../acoes";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-4">
            <Link href="/painel" className="text-lg font-semibold tracking-tight">
              Bancada
            </Link>
            <nav className="flex items-baseline gap-3 text-sm">
              <Link href="/painel" className="hover:underline">
                Painel
              </Link>
              <Link href="/ordens" className="hover:underline">
                Ordens
              </Link>
              {gerenciaEquipe(usuario) && (
                <Link href="/equipe" className="hover:underline">
                  Equipe
                </Link>
              )}
            </nav>
            <span className="hidden truncate text-xs text-neutral-500 sm:inline dark:text-neutral-400">
              {usuario.tenant?.nome}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">
              {usuario.first_name || usuario.username} · {usuario.papel}
            </span>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
