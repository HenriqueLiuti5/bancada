import Link from "next/link";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { PontoDeStatus } from "@/componentes/ui/Selo";
import { chamarApi } from "@/lib/api";
import { emReais } from "@/lib/moeda";
import type { Painel } from "@/lib/tipos";

export const dynamic = "force-dynamic";

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
    <>
      <CabecalhoDaPagina titulo="Painel" descricao={hojeEscrito()} />

      <div className="space-y-6">
        <GradeDeIndicadores>
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
            rotulo="Prontas para retirada"
            valor={String(painel.prontas)}
            nota="ocupando a prateleira"
            href="/ordens?status=pronto"
          />
        </GradeDeIndicadores>

        <GradeDeIndicadores>
          <Indicador
            rotulo="Aguardando peça"
            valor={String(painel.aguardando_peca)}
            nota="reparo parado por falta de peça"
            href="/ordens?status=aguardando_peca"
          />
          <Indicador
            rotulo="Aprovado em aberto"
            valor={emReais(painel.valor_aprovado_em_aberto)}
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
            nota={`${painel.entregues_no_mes} ${painel.entregues_no_mes === 1 ? "entregue" : "entregues"} no mês`}
          />
        </GradeDeIndicadores>

        <Cartao
          titulo="Fila por status"
          descricao="Quantas ordens estão em cada etapa agora"
          semEspaco
        >
          <ul className="divide-y divide-borda">
            {painel.por_status.map((linha) => {
              const vazia = linha.total === 0;
              return (
                <li key={linha.status}>
                  <Link
                    href={`/ordens?status=${linha.status}`}
                    className="flex items-center gap-4 px-5 py-2.5 transition-colors hover:bg-realce"
                  >
                    <span
                      className={`flex min-w-0 flex-1 items-center gap-2.5 text-sm sm:w-52 sm:flex-none ${vazia ? "text-texto-apagado" : ""}`}
                    >
                      <PontoDeStatus status={linha.status} />
                      <span className="truncate">{linha.rotulo}</span>
                    </span>

                    <span className="hidden h-1.5 flex-1 items-center sm:flex" aria-hidden="true">
                      {!vazia && (
                        <span
                          className="h-1.5 rounded-full bg-texto-apagado"
                          style={{ width: `${Math.max((linha.total / maior) * 100, 2)}%` }}
                        />
                      )}
                    </span>

                    <span
                      className={`w-8 shrink-0 text-right text-sm tabular-nums ${vazia ? "text-texto-apagado" : "font-medium"}`}
                    >
                      {linha.total}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Cartao>
      </div>
    </>
  );
}
