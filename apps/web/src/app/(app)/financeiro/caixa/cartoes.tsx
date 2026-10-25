import Link from "next/link";
import {
  ArrowUUpLeftIcon,
  CashRegisterIcon,
  ClipboardTextIcon,
  InvoiceIcon,
  ListChecksIcon,
  MoneyIcon,
  PiggyBankIcon,
  TrashIcon,
  TrayArrowDownIcon,
  WalletIcon,
  type Icon,
} from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Dinheiro } from "@/componentes/ui/Dinheiro";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { botaoDeIcone, juntar } from "@/componentes/ui/estilos";
import { linkDoMovimento, quandoNoCaixa, resultadoDaConferencia } from "@/lib/caixa";
import { horaEMinuto } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type {
  CaixaDeHoje,
  CaixaDoDia,
  ConferenciaDoCaixa,
  MovimentoDoCaixa,
  MovimentoDoDia,
  Pagina,
} from "@/lib/tipos";
import { removerMovimento } from "./acoes";

const COR_DO_RESULTADO = {
  bateu: "text-sucesso",
  sobrou: "text-aviso",
  faltou: "text-perigo",
  inicio: "text-texto-suave",
};

// O zero fica apagado, para o que entrou e saiu de verdade se destacar.
function Valor({
  valor,
  saida = false,
  className,
}: {
  valor: string | number;
  saida?: boolean;
  className?: string;
}) {
  const zero = Number(valor) === 0;
  return (
    <Dinheiro
      valor={valor}
      saida={saida && !zero}
      className={juntar(className, zero && "text-texto-apagado")}
    />
  );
}

function Linha({
  rotulo,
  dica,
  children,
  forte = false,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
  forte?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className={forte ? "font-bold" : "text-texto-suave"}>
        {rotulo}
        {dica && <span className="block text-xs font-normal text-texto-apagado">{dica}</span>}
      </dt>
      <dd className={juntar("tabular-nums", forte && "font-bold")}>{children}</dd>
    </div>
  );
}

function ResultadoDaConferencia({
  conferencia,
  hoje,
  fuso,
}: {
  conferencia: ConferenciaDoCaixa;
  hoje: string;
  fuso: string;
}) {
  const resultado = resultadoDaConferencia(conferencia.diferenca);
  const quem = conferencia.conferida_por ?? "A equipe";

  return (
    <li className="space-y-1 rounded-xl bg-realce px-4 py-3 text-sm sm:text-[13px]">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-semibold">
          {quem} contou <Dinheiro valor={conferencia.contado} />
        </span>
        <span className={juntar("font-semibold", COR_DO_RESULTADO[resultado.tom])}>
          {resultado.texto}
        </span>
      </p>
      <p className="text-texto-apagado">
        {quandoNoCaixa(conferencia.criado_em, hoje, fuso)}
        {conferencia.esperado != null && (
          <>
            {" "}
            · devia ter <Dinheiro valor={conferencia.esperado} />
          </>
        )}
        {Number(conferencia.retirado) > 0 && (
          <>
            {" "}
            · tirou <Dinheiro valor={conferencia.retirado} /> e deixou{" "}
            <Dinheiro valor={conferencia.na_gaveta} /> de troco
          </>
        )}
      </p>
      {conferencia.observacao && <p className="text-texto-suave">{conferencia.observacao}</p>}
    </li>
  );
}

export function GavetaDoDia({
  caixa,
  hoje,
  fuso,
  className,
}: {
  caixa: CaixaDoDia;
  hoje: string;
  fuso: string;
  className?: string;
}) {
  const { gaveta, conferencias } = caixa;
  const eHoje = caixa.dia === hoje;
  const depois = Number(gaveta.depois_da_conferencia ?? "0");

  return (
    <Cartao
      titulo="Gaveta"
      descricao="Só o dinheiro em espécie."
      icone={MoneyIcon}
      tour="gaveta-do-dia"
      className={className}
    >
      <dl className="text-sm sm:text-[13px]">
        <Linha
          rotulo="Começou o dia com"
          dica={gaveta.comeco === null ? "Ainda não havia conferência nesta loja." : undefined}
        >
          {gaveta.comeco === null ? "—" : <Valor valor={gaveta.comeco} />}
        </Linha>
        <Linha rotulo="Entrou em dinheiro">
          <Valor valor={gaveta.entrou} />
        </Linha>
        <Linha rotulo="Saiu em dinheiro" dica="Contas pagas e vendas desfeitas.">
          <Valor valor={gaveta.saiu} saida />
        </Linha>
        <Linha rotulo="Retiradas">
          <Valor valor={gaveta.retiradas} saida />
        </Linha>
        <Linha rotulo="Reforços">
          <Valor valor={gaveta.reforcos} />
        </Linha>
      </dl>

      {conferencias.length > 0 && (
        <ul className="mt-4 space-y-2">
          {conferencias.map((conferencia) => (
            <ResultadoDaConferencia key={conferencia.id} conferencia={conferencia} hoje={hoje} fuso={fuso} />
          ))}
        </ul>
      )}

      <dl className="mt-4 border-t border-borda pt-3 text-[15px] sm:text-sm">
        {conferencias.length > 0 && depois !== 0 && (
          <Linha rotulo="Depois da última conferência">
            <Dinheiro valor={Math.abs(depois)} saida={depois < 0} />
          </Linha>
        )}
        {gaveta.deve_ter === null ? (
          <p className="text-[13px] text-texto-suave sm:text-xs">
            {eHoje
              ? "Conte o dinheiro da gaveta e registre a primeira conferência. A partir dela, o Bancada acompanha quanto deve ter."
              : "Sem uma conferência antes deste dia, não há como saber quanto devia ter."}
          </p>
        ) : (
          <Linha rotulo={eHoje ? "Deve ter na gaveta agora" : "Devia ter no fim do dia"} forte>
            <Dinheiro valor={gaveta.deve_ter} />
          </Linha>
        )}
      </dl>
    </Cartao>
  );
}

export function PorFormaDePagamento({
  caixa,
  className,
}: {
  caixa: CaixaDoDia;
  className?: string;
}) {
  const linhas = caixa.por_forma.filter(
    (linha) => linha.forma !== "boleto" || Number(linha.saiu) > 0,
  );
  const total = (campo: "entrou" | "saiu") =>
    linhas.reduce((soma, linha) => soma + Math.round(Number(linha[campo]) * 100), 0) / 100;

  return (
    <Cartao titulo="Por forma de pagamento" icone={WalletIcon} semEspaco className={className}>
      <table className="w-full text-sm sm:text-[13px]">
        <thead>
          <tr className="border-b border-borda text-xs text-texto-apagado">
            <th className="px-5 py-2.5 text-left font-semibold">Forma</th>
            <th className="px-5 py-2.5 text-right font-semibold">Entrou</th>
            <th className="px-5 py-2.5 text-right font-semibold">Saiu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((linha) => (
            <tr key={linha.forma}>
              <td className="px-5 py-2.5">{linha.rotulo}</td>
              <td className="px-5 py-2.5 text-right">
                <Valor valor={linha.entrou} />
              </td>
              <td className="px-5 py-2.5 text-right">
                <Valor valor={linha.saiu} saida />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-borda bg-realce font-bold">
            <td className="px-5 py-2.5">Total</td>
            <td className="px-5 py-2.5 text-right">
              <Valor valor={total("entrou")} />
            </td>
            <td className="px-5 py-2.5 text-right">
              <Valor valor={total("saiu")} saida />
            </td>
          </tr>
        </tfoot>
      </table>
    </Cartao>
  );
}

const ICONE_DO_MOVIMENTO: Record<MovimentoDoDia["tipo"], Icon> = {
  ordem: ClipboardTextIcon,
  venda: CashRegisterIcon,
  venda_desfeita: ArrowUUpLeftIcon,
  conta: InvoiceIcon,
  retirada: PiggyBankIcon,
  reforco: TrayArrowDownIcon,
};

function LinhaDoMovimento({
  movimento,
  fuso,
  podeRemover,
}: {
  movimento: MovimentoDoDia;
  fuso: string;
  podeRemover: boolean;
}) {
  const Icone = ICONE_DO_MOVIMENTO[movimento.tipo];
  const valor = Number(movimento.valor);
  const link = linkDoMovimento(movimento);
  const detalhe = [
    movimento.momento ? horaEMinuto(new Date(movimento.momento), fuso) : "no dia",
    movimento.forma_rotulo,
    movimento.usuario,
  ]
    .filter(Boolean)
    .join(" · ");
  const conteudo = (
    <>
      <Icone size={18} className="shrink-0 text-icone" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{movimento.descricao}</span>
        <span className="block truncate text-xs text-texto-apagado">{detalhe}</span>
      </span>
      <Dinheiro valor={Math.abs(valor)} saida={valor < 0} className="shrink-0 font-semibold" />
    </>
  );
  const classes = "flex min-w-0 flex-1 items-center gap-3 py-3 text-sm sm:text-[13px]";

  return (
    <li className="flex items-center gap-2 px-5">
      {link ? (
        <Link href={link} className={juntar(classes, "transition-colors hover:text-destaque")}>
          {conteudo}
        </Link>
      ) : (
        <div className={classes}>{conteudo}</div>
      )}
      {podeRemover && movimento.movimento !== null && (
        <form action={removerMovimento}>
          <input type="hidden" name="movimento" value={movimento.movimento} />
          <button type="submit" title="Remover o que foi lançado errado" className={botaoDeIcone}>
            <TrashIcon size={16} />
            <span className="sr-only">Remover {movimento.descricao}</span>
          </button>
        </form>
      )}
    </li>
  );
}

export function MovimentosDoDia({
  caixa,
  fuso,
  podeRemover,
  className,
}: {
  caixa: CaixaDoDia;
  fuso: string;
  podeRemover: boolean;
  className?: string;
}) {
  return (
    <Cartao
      titulo="Movimentos do dia"
      descricao="Cada ordem paga, venda, conta paga, retirada e reforço, com quem fez."
      icone={ListChecksIcon}
      tour="movimentos-do-dia"
      semEspaco
      className={className}
    >
      {caixa.movimentos.length === 0 ? (
        <EstadoVazio
          icone={CashRegisterIcon}
          titulo="Nada entrou nem saiu neste dia"
          descricao="Os pagamentos das ordens, as vendas no balcão e as contas pagas aparecem aqui."
        />
      ) : (
        <ul className="divide-y divide-borda">
          {caixa.movimentos.map((movimento, indice) => (
            <LinhaDoMovimento
              key={`${movimento.tipo}-${indice}`}
              movimento={movimento}
              fuso={fuso}
              podeRemover={podeRemover}
            />
          ))}
        </ul>
      )}
    </Cartao>
  );
}

export function UltimasConferencias({
  conferencias,
  loja,
  hoje,
  fuso,
  className,
}: {
  conferencias: Pagina<ConferenciaDoCaixa>;
  loja: number;
  hoje: string;
  fuso: string;
  className?: string;
}) {
  const ultimas = conferencias.results.slice(0, 10);

  return (
    <Cartao titulo="Últimas conferências" icone={ListChecksIcon} semEspaco className={className}>
      {ultimas.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-texto-apagado">Nenhuma conferência nesta loja ainda.</p>
      ) : (
        <ul className="divide-y divide-borda">
          {ultimas.map((conferencia) => {
            const resultado = resultadoDaConferencia(conferencia.diferenca);
            return (
              <li key={conferencia.id}>
                <Link
                  href={`/financeiro/caixa?loja=${loja}&dia=${conferencia.dia}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors hover:bg-realce sm:text-[13px]"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">Contou {emReais(conferencia.contado)}</span>
                    <span className="block truncate text-xs text-texto-apagado">
                      {[conferencia.conferida_por, quandoNoCaixa(conferencia.criado_em, hoje, fuso)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className={juntar("shrink-0 font-semibold", COR_DO_RESULTADO[resultado.tom])}>
                    {resultado.texto}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Cartao>
  );
}

const LINHA_DE_HOJE = "flex items-center gap-3 px-5 py-3 text-sm sm:text-[13px]";

function RetiradaOuReforcoDeHoje({ movimento, fuso }: { movimento: MovimentoDoCaixa; fuso: string }) {
  const retirada = movimento.tipo === "retirada";
  const Icone = retirada ? PiggyBankIcon : TrayArrowDownIcon;

  return (
    <li className={LINHA_DE_HOJE}>
      <Icone size={18} className="shrink-0 text-icone" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{movimento.motivo || movimento.tipo_rotulo}</span>
        <span className="block truncate text-xs text-texto-apagado">
          {[movimento.tipo_rotulo, horaEMinuto(new Date(movimento.criado_em), fuso), movimento.registrado_por]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <Dinheiro valor={movimento.valor} saida={retirada} className="shrink-0 font-semibold" />
    </li>
  );
}

function ConferenciaDeHoje({ conferencia, fuso }: { conferencia: ConferenciaDoCaixa; fuso: string }) {
  return (
    <li className={LINHA_DE_HOJE}>
      <ListChecksIcon size={18} className="shrink-0 text-icone" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">Conferência</span>
        <span className="block truncate text-xs text-texto-apagado">
          {[horaEMinuto(new Date(conferencia.criado_em), fuso), conferencia.conferida_por]
            .filter(Boolean)
            .join(" · ")}
          {Number(conferencia.retirado) > 0 && ` · tirou ${emReais(conferencia.retirado)}`}
        </span>
      </span>
      <Dinheiro valor={conferencia.contado} className="shrink-0 font-semibold" />
    </li>
  );
}

// O que a equipe vê do caixa: o que foi registrado hoje, na ordem em que aconteceu, sem quanto
// devia ter.
export function HojeNaGaveta({ caixa, fuso }: { caixa: CaixaDeHoje; fuso: string }) {
  const registros = [
    ...caixa.movimentos.map((movimento) => ({ quando: movimento.criado_em, movimento })),
    ...caixa.conferencias.map((conferencia) => ({ quando: conferencia.criado_em, conferencia })),
  ].sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando));

  return (
    <Cartao titulo="Registrado hoje" icone={ListChecksIcon} semEspaco>
      {registros.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-texto-apagado">
          Nenhuma retirada, reforço ou conferência hoje.
        </p>
      ) : (
        <ul className="divide-y divide-borda">
          {registros.map((registro) =>
            "movimento" in registro ? (
              <RetiradaOuReforcoDeHoje
                key={`movimento-${registro.movimento.id}`}
                movimento={registro.movimento}
                fuso={fuso}
              />
            ) : (
              <ConferenciaDeHoje
                key={`conferencia-${registro.conferencia.id}`}
                conferencia={registro.conferencia}
                fuso={fuso}
              />
            ),
          )}
        </ul>
      )}
    </Cartao>
  );
}
