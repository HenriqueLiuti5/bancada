import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Bancada</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Entre para acompanhar as ordens de serviço
        </p>
      </header>

      <FormularioLogin />
    </main>
  );
}
