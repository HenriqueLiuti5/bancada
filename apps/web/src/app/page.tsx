import { fetchHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  database: "PostgreSQL",
  redis: "Redis",
  api: "API Django",
};

export default async function Home() {
  const health = await fetchHealth();
  const services = Object.entries(health.checks);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Bancada</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Ordens de serviço para assistências técnicas de celular
        </p>
      </header>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Estado do ambiente</h2>
          <span
            className={
              health.status === "ok"
                ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                : "rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400"
            }
          >
            {health.status}
          </span>
        </div>

        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <li className="flex items-center justify-between px-5 py-3">
            <span className="text-sm">Next.js</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">no ar</span>
          </li>
          {services.map(([name, check]) => (
            <li key={name} className="flex items-center justify-between gap-4 px-5 py-3">
              <span className="text-sm">{LABELS[name] ?? name}</span>
              <span
                className={
                  check.ok
                    ? "text-xs text-emerald-600 dark:text-emerald-400"
                    : "truncate text-xs text-red-600 dark:text-red-400"
                }
                title={check.detail}
              >
                {check.ok ? "no ar" : check.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Fase 0 concluída quando todos os serviços acima estiverem no ar.
      </p>
    </main>
  );
}
