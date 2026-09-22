import Link from "next/link";
import { chamarApi } from "@/lib/api";
import type { Cliente, Loja, Pagina } from "@/lib/tipos";
import { FormularioDeAbertura } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NovaOrdem() {
  const [lojas, clientes] = await Promise.all([
    chamarApi<Loja[]>("/api/lojas/"),
    chamarApi<Pagina<Cliente>>("/api/clientes/"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/ordens"
          className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
        >
          ← Todas as ordens
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Nova ordem de serviço</h1>
      </header>

      <FormularioDeAbertura lojas={lojas} clientes={clientes.results} />
    </div>
  );
}
