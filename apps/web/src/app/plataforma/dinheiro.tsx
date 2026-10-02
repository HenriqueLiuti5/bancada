import { Cartao } from "@/componentes/ui/Cartao";
import { Secao } from "@/componentes/ui/Secao";
import { juntar } from "@/componentes/ui/estilos";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { PainelDaPlataforma } from "@/lib/tipos";
import { CustosDoMes } from "./custos";

type Dinheiro = PainelDaPlataforma["dinheiro"];

function Linha({ rotulo, nota, valor }: { rotulo: string; nota?: string; valor: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block text-sm">{rotulo}</span>
        {nota && <span className="block text-xs text-texto-apagado">{nota}</span>}
      </span>
      <span className="shrink-0 text-sm tabular-nums">{valor}</span>
    </li>
  );
}

function Lucro({ dinheiro, nome }: { dinheiro: Dinheiro; nome: string }) {
  const negativo = Number(dinheiro.lucro) < 0;

  return (
    <Cartao>
      <p className="text-[13px] text-texto-suave">Lucro de {nome}</p>
      <p
        className={juntar(
          "mt-2 text-4xl leading-none font-semibold tracking-tight sm:text-5xl",
          negativo && "text-perigo-forte",
        )}
      >
        {emReais(dinheiro.lucro)}
      </p>

      <ul className="mt-6 divide-y divide-borda border-t border-borda">
        <Linha
          rotulo="Recebido das assinaturas"
          nota={contagem(dinheiro.faturas_pagas, "fatura paga", "faturas pagas")}
          valor={emReais(dinheiro.recebido)}
        />
        <Linha rotulo="Taxas do Asaas" valor={`−${emReais(dinheiro.taxas)}`} />
        <Linha rotulo="Custos do mês" valor={`−${emReais(dinheiro.custos)}`} />
      </ul>
    </Cartao>
  );
}

export function SecaoDinheiro({
  dinheiro,
  mes,
  nome,
}: {
  dinheiro: Dinheiro;
  mes: string;
  nome: string;
}) {
  return (
    <Secao titulo="Dinheiro" descricao="O que as assinaturas pagaram no mês, o que saiu e o que sobrou.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Lucro dinheiro={dinheiro} nome={nome} />
        <CustosDoMes key={mes} mes={mes} nome={nome} custos={dinheiro.lista_de_custos} />
      </div>
    </Secao>
  );
}
