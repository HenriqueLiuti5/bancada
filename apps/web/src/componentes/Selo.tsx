const CORES: Record<string, string> = {
  recebido: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  em_diagnostico: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  orcamento_enviado: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  aprovado: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  reprovado: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  em_reparo: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  aguardando_peca: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  pronto: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  entregue: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300",
  devolvido_sem_reparo: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400",
};

export function Selo({ status, rotulo }: { status: string; rotulo: string }) {
  const cor = CORES[status] ?? CORES.recebido;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${cor}`}>
      {rotulo}
    </span>
  );
}
