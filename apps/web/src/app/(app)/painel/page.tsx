import Link from "next/link";
import { Indicador } from "@/componentes/Indicador";
import { chamarApi } from "@/lib/api";
import type { Painel } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function hojeEscrito(): string {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function emDias(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor.toLocaleString("pt-BR")} ${valor === 1 ? "dia" : "dias"}`;
}

export default async function PainelDoDia() {
  const painel = await chamarApi<Painel>("/api/ordens/painel/");
  const maior = Math.max(...painel.por_status.map((linha) => linha.total), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{hojeEscrito()}</p>
        </div>
        <Link
          href="/ordens/nova"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Nova OS
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo="Na bancada"
          valor={String(painel.abertas)}
          nota="ordens ainda abertas"
          href="/ordens?situacao=abertas"
        />
        <Indicador
          rotulo="Atrasadas"
          valor={String(painel.atrasadas)}
          nota="passaram do prazo prometido"
          href="/ordens?atrasadas=1"
          alerta={painel.atrasadas > 0}
        />
        <Indicador
          rotulo="Esperando o cliente"
          valor={String(painel.aguardando_cliente)}
          nota="orçamento enviado, sem resposta"
          href="/ordens?status=orcamento_enviado"
        />
        <Indicador
          rotulo="Prontas"
          valor={String(painel.prontas)}
          nota="aguardando retirada"
          href="/ordens?status=pronto"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo="Aguardando peça"
          valor={String(painel.aguardando_peca)}
          nota="reparo parado por falta de peça"
          href="/ordens?status=aguardando_peca"
        />
        <Indicador
          rotulo="Aprovado em aberto"
          valor={MOEDA.format(Number(painel.valor_aprovado_em_aberto))}
          nota="a receber nas ordens abertas"
        />
        <Indicador
          rotulo="Tempo médio de reparo"
          valor={emDias(painel.dias_medios_de_reparo)}
          nota={`entregas dos últimos ${painel.dias_da_media} dias`}
        />
        <Indicador
          rotulo="Abertas hoje"
          valor={String(painel.abertas_hoje)}
          nota={`${painel.entregues_no_mes} entregues no mês`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Fila por status</h2>
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {painel.por_status.map((linha) => (
            <li key={linha.status}>
              <Link
                href={`/ordens?status=${linha.status}`}
                className="flex items-center gap-4 px-5 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span
                  className={
                    linha.total === 0
                      ? "min-w-0 flex-1 truncate text-sm text-neutral-400 sm:w-48 sm:flex-none dark:text-neutral-600"
                      : "min-w-0 flex-1 truncate text-sm sm:w-48 sm:flex-none"
                  }
                >
                  {linha.rotulo}
                </span>

                <span className="hidden h-2 flex-1 items-center sm:flex" aria-hidden="true">
                  {linha.total > 0 && (
                    <span
                      className="h-2 rounded-full bg-sky-600/70 dark:bg-sky-400/70"
                      style={{ width: `${Math.max((linha.total / maior) * 100, 3)}%` }}
                    />
                  )}
                </span>

                <span
                  className={
                    linha.total === 0
                      ? "w-8 shrink-0 text-right text-sm text-neutral-400 tabular-nums dark:text-neutral-600"
                      : "w-8 shrink-0 text-right text-sm font-medium tabular-nums"
                  }
                >
                  {linha.total}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
