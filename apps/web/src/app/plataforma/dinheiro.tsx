import { PiggyBankIcon, WalletIcon } from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Dinheiro } from "@/componentes/ui/Dinheiro";
import { Secao } from "@/componentes/ui/Secao";
import { juntar } from "@/componentes/ui/estilos";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { PainelDaPlataforma } from "@/lib/tipos";
import { CustosDoMes } from "./custos";

type DinheiroDoMes = PainelDaPlataforma["dinheiro"];

function Linha({ rotulo, nota, valor }: { rotulo: string; nota?: string; valor: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{rotulo}</span>
        {nota && <span className="block text-xs text-texto-apagado">{nota}</span>}
      </span>
      <span className="shrink-0 text-sm font-semibold">{valor}</span>
    </li>
  );
}

function Lucro({ dinheiro, nome }: { dinheiro: DinheiroDoMes; nome: string }) {
  const negativo = Number(dinheiro.lucro) < 0;

  return (
    <Cartao>
      <div className="flex items-center gap-2.5">
        <PiggyBankIcon size={22} className="shrink-0 text-icone" />
        <p className="text-sm font-medium text-texto-apagado">Lucro de {nome}</p>
      </div>
      <p
        className={juntar(
          "mt-4 text-4xl leading-none font-bold tracking-tight tabular-nums sm:text-5xl",
          negativo ? "text-perigo" : "text-dinheiro",
        )}
      >
        {emReais(dinheiro.lucro)}
      </p>

      <ul className="mt-6 divide-y divide-borda border-t border-borda">
        <Linha
          rotulo="Recebido das assinaturas"
          nota={contagem(dinheiro.faturas_pagas, "fatura paga", "faturas pagas")}
          valor={<Dinheiro valor={dinheiro.recebido} />}
        />
        <Linha rotulo="Taxas do Asaas" valor={<Dinheiro valor={dinheiro.taxas} saida />} />
        <Linha rotulo="Custos do mês" valor={<Dinheiro valor={dinheiro.custos} saida />} />
      </ul>
    </Cartao>
  );
}

export function SecaoDinheiro({
  dinheiro,
  mes,
  nome,
}: {
  dinheiro: DinheiroDoMes;
  mes: string;
  nome: string;
}) {
  return (
    <Secao titulo="Dinheiro" icone={WalletIcon} descricao="O que as assinaturas pagaram no mês, o que saiu e o que sobrou.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Lucro dinheiro={dinheiro} nome={nome} />
        <CustosDoMes key={mes} mes={mes} nome={nome} custos={dinheiro.lista_de_custos} />
      </div>
    </Secao>
  );
}
