import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon, StorefrontIcon } from "@/componentes/icones";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";
import { botao, botaoDeIcone, juntar } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { diaPorExtenso, hojeEmIso, somarDias } from "@/lib/datas";
import type { CaixaDeHoje, CaixaDoDia, ConferenciaDoCaixa, Loja, Pagina } from "@/lib/tipos";
import { fusoDaAssistencia, gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { Tour } from "../../tour";
import { CabecalhoDoFinanceiro } from "../cabecalho";
import { AcoesDoCaixa } from "./acoesDoCaixa";
import {
  GavetaDoDia,
  HojeNaGaveta,
  MovimentosDoDia,
  PorFormaDePagamento,
  UltimasConferencias,
} from "./cartoes";

export const dynamic = "force-dynamic";

const DIA_EM_ISO = /^\d{4}-\d{2}-\d{2}$/;

type Parametros = Record<string, string | string[] | undefined>;

function endereco(loja: number, dia?: string): string {
  return dia ? `/financeiro/caixa?loja=${loja}&dia=${dia}` : `/financeiro/caixa?loja=${loja}`;
}

function nomeDoDia(dia: string, hoje: string): string {
  if (dia === hoje) return `Hoje, ${diaPorExtenso(dia)}`;
  if (dia === somarDias(hoje, -1)) return `Ontem, ${diaPorExtenso(dia)}`;
  return diaPorExtenso(dia);
}

function NavegacaoDoDia({ loja, dia, hoje }: { loja: number; dia: string; hoje: string }) {
  const anterior = somarDias(dia, -1);
  const seguinte = somarDias(dia, 1);

  return (
    <nav aria-label="Dia do caixa" className="flex flex-wrap items-center gap-2">
      <Link href={endereco(loja, anterior)} className={botaoDeIcone} title="Dia anterior">
        <CaretLeftIcon size={18} />
        <span className="sr-only">Dia anterior</span>
      </Link>
      <h2 className="min-w-44 text-center text-[15px] font-semibold">{nomeDoDia(dia, hoje)}</h2>
      {dia < hoje ? (
        <Link href={endereco(loja, seguinte)} className={botaoDeIcone} title="Dia seguinte">
          <CaretRightIcon size={18} />
          <span className="sr-only">Dia seguinte</span>
        </Link>
      ) : (
        <span className={juntar(botaoDeIcone, "pointer-events-none opacity-30")} aria-hidden>
          <CaretRightIcon size={18} />
        </span>
      )}
      {dia !== hoje && (
        <Link href={endereco(loja)} className={botao("fantasma", "sm")}>
          Ir para hoje
        </Link>
      )}
    </nav>
  );
}

export default async function Caixa({ searchParams }: { searchParams: Promise<Parametros> }) {
  const recebidos = await searchParams;
  const [usuario, todas] = await Promise.all([usuarioAtual(), chamarApi<Loja[]>("/api/lojas/")]);
  const dono = gerenciaEquipe(usuario);
  const fuso = fusoDaAssistencia(usuario);
  const hoje = hojeEmIso(fuso);
  const lojas = todas.filter((loja) => loja.ativa);

  const cabecalho = (
    <CabecalhoDoFinanceiro
      ativa="caixa"
      dono={dono}
      titulo="Caixa do dia"
      descricao={
        dono
          ? "O que entrou e saiu em cada forma de pagamento e o dinheiro da gaveta de cada loja. Só quem é dono vê quanto devia ter."
          : "Registre o dinheiro que sai ou entra na gaveta e conte o dinheiro no fim do dia. O dono confere se bateu."
      }
    />
  );

  if (lojas.length === 0) {
    return (
      <>
        {cabecalho}
        <EstadoVazio
          icone={StorefrontIcon}
          titulo="Nenhuma loja ativa"
          descricao="O caixa é de cada loja. Reative uma loja na tela Assistência."
        />
      </>
    );
  }

  const pedida = typeof recebidos.loja === "string" ? Number(recebidos.loja) : NaN;
  const loja = lojas.find((opcao) => opcao.id === pedida) ?? lojas[0];
  const pedido = typeof recebidos.dia === "string" ? recebidos.dia : "";
  const dia = DIA_EM_ISO.test(pedido) && pedido <= hoje ? pedido : hoje;

  const escolhaDaLoja = lojas.length > 1 && (
    <Segmentos>
      {lojas.map((opcao) => (
        <Segmento key={opcao.id} href={endereco(opcao.id, dono ? dia : undefined)} ativo={opcao.id === loja.id}>
          {opcao.nome}
        </Segmento>
      ))}
    </Segmentos>
  );

  if (!dono) {
    const deHoje = await chamarApi<CaixaDeHoje>(`/api/caixa/hoje/?loja=${loja.id}`);
    return (
      <>
        {cabecalho}
        <div className="max-w-3xl space-y-6">
          {escolhaDaLoja}
          <AcoesDoCaixa loja={loja.id} dono={false} />
          <HojeNaGaveta caixa={deHoje} fuso={fuso} />
        </div>
        <Tour nome="caixa" />
      </>
    );
  }

  const [caixa, conferencias] = await Promise.all([
    chamarApi<CaixaDoDia>(`/api/caixa/?loja=${loja.id}&dia=${dia}`),
    chamarApi<Pagina<ConferenciaDoCaixa>>(`/api/caixa/conferencias/?loja=${loja.id}`),
  ]);

  return (
    <>
      {cabecalho}
      <div className="space-y-6">
        {escolhaDaLoja}
        <NavegacaoDoDia loja={loja.id} dia={dia} hoje={hoje} />
        {dia === hoje && <AcoesDoCaixa loja={loja.id} dono />}

        {/* No computador, duas colunas que não dependem da altura uma da outra. No celular, as
            colunas somem e a ordem fica gaveta, formas de pagamento, movimentos e conferências. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <div className="contents lg:block lg:space-y-6">
            <GavetaDoDia caixa={caixa} hoje={hoje} fuso={fuso} className="order-1" />
            <MovimentosDoDia caixa={caixa} fuso={fuso} podeRemover className="order-3" />
          </div>
          <div className="contents lg:block lg:space-y-6">
            <PorFormaDePagamento caixa={caixa} className="order-2" />
            <UltimasConferencias
              conferencias={conferencias}
              loja={loja.id}
              hoje={hoje}
              fuso={fuso}
              className="order-4"
            />
          </div>
        </div>
      </div>
      <Tour nome="caixa" />
    </>
  );
}
