import { Timer } from "lucide-react";
import { BarrasHorizontais } from "@/componentes/BarrasHorizontais";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { PontoDeStatus } from "@/componentes/ui/Selo";
import type { Painel } from "@/lib/tipos";
import { emDias, emHoras } from "./formatos";
import { Secao } from "./secao";
import { Variacao } from "./variacao";

function TempoPorEtapa({ etapas }: { etapas: Painel["operacao"]["tempo_por_etapa"] }) {
  return (
    <Cartao
      tour="etapas"
      titulo="Tempo em cada etapa"
      descricao="Quanto uma ordem fica, em média, em cada etapa antes de seguir para a próxima."
      semEspaco
    >
      {etapas.length === 0 ? (
        <EstadoVazio
          icone={<Timer size={18} strokeWidth={1.75} />}
          titulo="Nenhuma etapa concluída no período"
          descricao="Quando as ordens mudarem de status, o tempo de cada etapa aparece aqui."
        />
      ) : (
        <BarrasHorizontais
          empilhada
          larguraDoValor="w-auto"
          linhas={etapas.map((etapa) => ({
            chave: etapa.status,
            rotulo: etapa.rotulo,
            marca: <PontoDeStatus status={etapa.status} />,
            medida: etapa.horas,
            valor: emHoras(etapa.horas),
          }))}
        />
      )}
    </Cartao>
  );
}

function FilaPorStatus({ linhas }: { linhas: Painel["agora"]["por_status"] }) {
  return (
    <Cartao
      tour="fila"
      titulo="Fila por status"
      descricao="Quantas ordens estão em cada etapa agora"
      semEspaco
    >
      <BarrasHorizontais
        empilhada
        linhas={linhas.map((linha) => ({
          chave: linha.status,
          rotulo: linha.rotulo,
          marca: <PontoDeStatus status={linha.status} />,
          medida: linha.total,
          valor: String(linha.total),
          href: `/ordens?status=${linha.status}`,
        }))}
      />
    </Cartao>
  );
}

export function SecaoOperacao({ painel }: { painel: Painel }) {
  const { abertas, entregues, dias_medios_de_reparo: reparo } = painel.operacao;
  const emNumero = (valor: number) => valor.toLocaleString("pt-BR");

  return (
    <Secao titulo="Operação" descricao="O ritmo da bancada no período." tour="operacao">
      <GradeDeIndicadores colunas={3}>
        <Indicador
          rotulo="Ordens abertas"
          valor={emNumero(abertas.atual)}
          nota={<Variacao atual={abertas.atual} anterior={abertas.anterior} formatar={emNumero} />}
        />
        <Indicador
          rotulo="Ordens entregues"
          valor={emNumero(entregues.atual)}
          nota={
            <Variacao atual={entregues.atual} anterior={entregues.anterior} formatar={emNumero} />
          }
        />
        <Indicador
          rotulo="Tempo médio de reparo"
          valor={emDias(reparo.atual)}
          nota={<Variacao atual={reparo.atual} anterior={reparo.anterior} formatar={emDias} />}
        />
      </GradeDeIndicadores>

      <div className="grid gap-6 lg:grid-cols-2">
        <TempoPorEtapa etapas={painel.operacao.tempo_por_etapa} />
        <FilaPorStatus linhas={painel.agora.por_status} />
      </div>
    </Secao>
  );
}
