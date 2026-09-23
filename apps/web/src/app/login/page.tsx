import { Marca } from "@/componentes/ui/Marca";
import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <Marca tamanho="md" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Entrar no Bancada</h1>
            <p className="text-sm text-texto-suave">Ordens de serviço da sua assistência técnica</p>
          </div>
        </header>

        <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sutil">
          <FormularioLogin />
        </div>
      </div>
    </main>
  );
}
