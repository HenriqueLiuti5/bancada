import { Colunas } from "@/componentes/Colunas";
import { TrendUpIcon, UserPlusIcon, WalletIcon } from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Secao } from "@/componentes/ui/Secao";
import {
  diaEMesEmNumeros,
  intervaloEscrito,
  mesAbreviado,
  mesPorExtenso,
  somarDias,
} from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type { PainelDaPlataforma } from "@/lib/tipos";

type Crescimento = PainelDaPlataforma["crescimento"];

const DIAS_DEPOIS_DA_SEGUNDA = 6;

export function SecaoCrescimento({ crescimento }: { crescimento: Crescimento }) {
  return (
    <Secao titulo="Crescimento" icone={TrendUpIcon} descricao="Cadastros e receita ao longo do tempo, até hoje.">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Cartao
          titulo="Cadastros por semana"
          icone={UserPlusIcon}
          descricao="Assistências novas nas últimas 12 semanas"
          semEspaco
        >
          <Colunas
            titulo="Cadastros por semana nas últimas 12 semanas"
            nomeDoPeriodo="Semana"
            nomeDaMedida="Cadastros"
            passoNoCelular={3}
            colunas={crescimento.cadastros_por_semana.map((semana) => ({
              chave: semana.inicio,
              rotulo: diaEMesEmNumeros(semana.inicio),
              descricao: `Semana de ${intervaloEscrito(semana.inicio, somarDias(semana.inicio, DIAS_DEPOIS_DA_SEGUNDA))}`,
              medida: semana.total,
              valor: String(semana.total),
            }))}
          />
        </Cartao>

        <Cartao
          titulo="Recebido por mês"
          icone={WalletIcon}
          descricao="Mensalidades pagas nos últimos 12 meses"
          semEspaco
        >
          <Colunas
            titulo="Recebido por mês nos últimos 12 meses"
            nomeDoPeriodo="Mês"
            nomeDaMedida="Recebido"
            dinheiro
            passoNoCelular={2}
            colunas={crescimento.recebido_por_mes.map((mes) => ({
              chave: mes.mes,
              rotulo: mesAbreviado(mes.mes),
              descricao: mesPorExtenso(mes.mes),
              medida: Number(mes.recebido),
              valor: emReais(mes.recebido),
            }))}
          />
        </Cartao>
      </div>
    </Secao>
  );
}
