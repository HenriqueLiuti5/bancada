import { BarrasHorizontais } from "@/componentes/BarrasHorizontais";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import {
  ChartPieSliceIcon,
  CreditCardIcon,
  RepeatIcon,
  TargetIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Secao } from "@/componentes/ui/Secao";
import { IconeDeStatus } from "@/componentes/ui/Selo";
import { contagem, emPorcentagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { PainelDaPlataforma } from "@/lib/tipos";

type Assinaturas = PainelDaPlataforma["assinaturas"];

function notaDaConversao({ assinaram, decidiram }: Assinaturas["conversao"]): string {
  if (decidiram === 0) return "ninguém terminou o teste ainda";
  return `${assinaram} de ${decidiram} que terminaram o teste`;
}

export function SecaoAssinaturas({
  assinaturas,
  nome,
}: {
  assinaturas: Assinaturas;
  nome: string;
}) {
  const { receita_recorrente: receita, conversao } = assinaturas;

  return (
    <Secao
      titulo="Assinaturas"
      icone={CreditCardIcon}
      descricao="Em que pé está cada assistência agora, e o que mudou no mês."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Situação agora" icone={ChartPieSliceIcon} semEspaco>
          <BarrasHorizontais
            empilhada
            linhas={assinaturas.por_situacao.map((linha) => ({
              chave: linha.situacao,
              rotulo: linha.rotulo,
              marca: <IconeDeStatus status={linha.situacao} />,
              medida: linha.total,
              valor: String(linha.total),
            }))}
          />
        </Cartao>

        <GradeDeIndicadores colunas={2}>
          <Indicador
            rotulo="Receita recorrente"
            icone={RepeatIcon}
            valor={emReais(receita.valor)}
            nota={`${contagem(receita.assinaturas, "assinatura pagando", "assinaturas pagando")} por mês`}
          />
          <Indicador
            rotulo="Conversão do teste"
            icone={TargetIcon}
            valor={emPorcentagem(conversao.taxa)}
            nota={notaDaConversao(conversao)}
          />
          <Indicador
            rotulo="Assinaturas novas"
            icone={UserPlusIcon}
            valor={String(assinaturas.novas_no_mes)}
            nota={`em ${nome}`}
          />
          <Indicador
            rotulo="Cancelamentos"
            icone={UserMinusIcon}
            valor={String(assinaturas.canceladas_no_mes)}
            nota={`em ${nome}`}
          />
        </GradeDeIndicadores>
      </div>
    </Secao>
  );
}
