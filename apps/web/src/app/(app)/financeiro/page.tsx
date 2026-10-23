import Link from "next/link";
import { redirect } from "next/navigation";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import {
  AlarmIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReceiptIcon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";
import { botao } from "@/componentes/ui/estilos";
import { ErroDaApi, chamarApi } from "@/lib/api";
import { hojeEmIso } from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { ContaAPagar, Loja, Pagina, ResumoDasContas } from "@/lib/tipos";
import { fusoDaAssistencia, gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { Tour } from "../tour";
import { FiltrosDasContas, type ValoresDasContas } from "./filtros";
import { NovaConta } from "./novaConta";
import { VencimentoDaConta } from "./vencimento";

export const dynamic = "force-dynamic";

const FILTROS = ["busca", "categoria", "situacao"] as const;
const POR_PAGINA = 25;

const COLUNAS = "sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_7.5rem] sm:items-center sm:gap-x-4";

type Parametros = Record<string, string | string[] | undefined>;

function lerParametros(recebidos: Parametros): URLSearchParams {
  const consulta = new URLSearchParams();
  for (const chave of [...FILTROS, "page"]) {
    const valor = recebidos[chave];
    if (typeof valor === "string" && valor !== "") consulta.set(chave, valor);
  }
  return consulta;
}

function endereco(consulta: URLSearchParams): string {
  const texto = consulta.toString();
  return texto ? `/financeiro?${texto}` : "/financeiro";
}

function comSituacao(atual: URLSearchParams, situacao: string | null): string {
  const consulta = new URLSearchParams(atual);
  if (situacao === null) consulta.delete("situacao");
  else consulta.set("situacao", situacao);
  consulta.delete("page");
  return endereco(consulta);
}

function paginaVizinha(atual: URLSearchParams, numero: number): string {
  const consulta = new URLSearchParams(atual);
  if (numero <= 1) consulta.delete("page");
  else consulta.set("page", String(numero));
  return endereco(consulta);
}

async function buscarContas(consulta: URLSearchParams): Promise<Pagina<ContaAPagar> | null> {
  try {
    return await chamarApi<Pagina<ContaAPagar>>(`/api/contas-a-pagar/?${consulta}`);
  } catch (erro) {
    if (erro instanceof ErroDaApi && erro.status === 404) return null;
    throw erro;
  }
}

async function LancamentoPelaEquipe({ hoje }: { hoje: string }) {
  const lojas = await chamarApi<Loja[]>("/api/lojas/");

  return (
    <>
      <CabecalhoDaPagina
        titulo="Lançar conta"
        descricao="Chegou um boleto ou pagou alguma coisa com o dinheiro da loja? Lance aqui. Só o dono vê a lista e os totais."
      />
      <div className="max-w-3xl">
        <Cartao titulo="Conta" icone={ReceiptIcon} tour="conta-da-equipe">
          <NovaConta
            lojas={lojas.filter((loja) => loja.ativa)}
            fornecedores={[]}
            hoje={hoje}
            eDono={false}
          />
        </Cartao>
      </div>
      <Tour nome="financeiro" />
    </>
  );
}

function ResumoDoTopo({ resumo }: { resumo: ResumoDasContas }) {
  const { vencidas, proximos_dias: proximas, pagas_no_mes: pagas } = resumo;

  return (
    <GradeDeIndicadores tour="resumo-das-contas" colunas={3}>
      <Indicador
        rotulo="Vencidas"
        icone={AlarmIcon}
        valor={emReais(vencidas.valor)}
        dinheiro
        alerta={vencidas.contas > 0}
        nota={vencidas.contas > 0 ? `${contagem(vencidas.contas, "conta", "contas")} sem pagamento` : "nada atrasado"}
        href={vencidas.contas > 0 ? "/financeiro?situacao=vencidas" : undefined}
      />
      <Indicador
        rotulo="Vencem em 7 dias"
        icone={CalendarDotsIcon}
        valor={emReais(proximas.valor)}
        dinheiro
        nota={contagem(proximas.contas, "conta", "contas")}
      />
      <Indicador
        rotulo="Pagas neste mês"
        icone={CalendarCheckIcon}
        valor={emReais(pagas.valor)}
        dinheiro
        nota={contagem(pagas.contas, "conta", "contas")}
        href={pagas.contas > 0 ? "/financeiro?situacao=pagas" : undefined}
      />
    </GradeDeIndicadores>
  );
}

function SemContas({ situacao, filtrando }: { situacao: string; filtrando: boolean }) {
  if (filtrando) {
    return (
      <EstadoVazio
        icone={MagnifyingGlassIcon}
        titulo="Nenhuma conta com esses filtros"
        descricao="Tente outra busca ou outra categoria."
        acao={
          <Link href={situacao ? `/financeiro?situacao=${situacao}` : "/financeiro"} className={botao("secundario", "sm")}>
            Limpar filtros
          </Link>
        }
      />
    );
  }
  if (situacao === "vencidas") {
    return <EstadoVazio icone={CheckCircleIcon} titulo="Nenhuma conta vencida" descricao="Tudo o que venceu já foi pago." />;
  }
  if (situacao === "pagas") {
    return (
      <EstadoVazio
        icone={ReceiptIcon}
        titulo="Nenhuma conta paga ainda"
        descricao="As contas marcadas como pagas aparecem aqui, da mais recente para a mais antiga."
      />
    );
  }
  return (
    <EstadoVazio
      icone={ReceiptIcon}
      titulo="Nada a pagar"
      descricao="Lance o aluguel, a luz, os salários e as compras da loja para ver o que vence e o que já foi pago."
      acao={
        <Link href="/financeiro/contas/nova" className={botao("primario", "sm")}>
          <PlusIcon size={16} />
          Lançar conta
        </Link>
      }
    />
  );
}

function LinhaDaConta({
  conta,
  hoje,
  variasLojas,
}: {
  conta: ContaAPagar;
  hoje: string;
  variasLojas: boolean;
}) {
  const detalhe = [
    conta.categoria_rotulo,
    conta.fornecedor,
    variasLojas ? (conta.loja_nome ?? "Toda a assistência") : "",
    conta.repete ? "todo mês" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={`/financeiro/contas/${conta.id}`}
        className={`${COLUNAS} grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-4 py-3.5 transition-colors duration-150 hover:bg-realce sm:px-5`}
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold sm:text-sm">{conta.descricao}</span>
          <span className="block truncate text-sm text-texto-apagado sm:text-[13px]">{detalhe}</span>
        </span>
        <span className="text-right text-[15px] font-semibold text-dinheiro tabular-nums sm:order-last sm:text-sm">
          {emReais(conta.valor)}
        </span>
        <span className="col-span-2 text-[13px] text-texto-suave sm:col-span-1">
          <VencimentoDaConta conta={conta} hoje={hoje} />
        </span>
      </Link>
    </li>
  );
}

export default async function ContasAPagar({ searchParams }: { searchParams: Promise<Parametros> }) {
  const recebidos = await searchParams;
  const usuario = await usuarioAtual();
  const hoje = hojeEmIso(fusoDaAssistencia(usuario));
  if (!gerenciaEquipe(usuario)) return <LancamentoPelaEquipe hoje={hoje} />;

  const consulta = lerParametros(recebidos);
  const [pagina, resumo, lojas] = await Promise.all([
    buscarContas(consulta),
    chamarApi<ResumoDasContas>("/api/contas-a-pagar/resumo/"),
    chamarApi<Loja[]>("/api/lojas/"),
  ]);
  if (pagina === null) redirect(paginaVizinha(consulta, 1));

  const valores: ValoresDasContas = {
    busca: consulta.get("busca") ?? "",
    categoria: consulta.get("categoria") ?? "",
    situacao: consulta.get("situacao") ?? "",
  };
  const filtrando = Boolean(valores.busca || valores.categoria);
  const numeroDaPagina = Number(consulta.get("page") ?? "1");
  const primeira = (numeroDaPagina - 1) * POR_PAGINA + 1;
  const ultima = Math.min(numeroDaPagina * POR_PAGINA, pagina.count);
  const pagas = valores.situacao === "pagas";

  return (
    <>
      <CabecalhoDaPagina
        titulo="Contas a pagar"
        descricao="As contas da loja, com o que vence primeiro no alto. Só quem é dono vê esta tela."
        acoes={
          <Link href="/financeiro/contas/nova" data-tour="lancar-conta" className={botao("primario")}>
            <PlusIcon size={18} />
            Lançar conta
          </Link>
        }
      />

      <div className="space-y-6">
        {recebidos.lancada === "1" && <Mensagem tipo="sucesso">Conta lançada.</Mensagem>}
        {recebidos.removida === "1" && <Mensagem tipo="sucesso">Conta removida.</Mensagem>}

        <ResumoDoTopo resumo={resumo} />

        <div className="space-y-4">
          <Segmentos>
            <Segmento href={comSituacao(consulta, null)} ativo={!valores.situacao}>
              A pagar
            </Segmento>
            <Segmento href={comSituacao(consulta, "vencidas")} ativo={valores.situacao === "vencidas"}>
              Vencidas
            </Segmento>
            <Segmento href={comSituacao(consulta, "pagas")} ativo={pagas}>
              Pagas
            </Segmento>
          </Segmentos>

          <FiltrosDasContas valores={valores} />

          <div
            data-tour="lista-de-contas"
            className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao"
          >
            {pagina.results.length === 0 ? (
              <SemContas situacao={valores.situacao} filtrando={filtrando} />
            ) : (
              <>
                <div
                  className={`${COLUNAS} hidden border-b border-borda px-5 py-3 text-xs font-semibold text-texto-apagado`}
                >
                  <span>Conta</span>
                  <span>{pagas ? "Pagamento" : "Vencimento"}</span>
                  <span className="text-right">Valor</span>
                </div>

                <ul className="divide-y divide-borda">
                  {pagina.results.map((conta) => (
                    <LinhaDaConta key={conta.id} conta={conta} hoje={hoje} variasLojas={lojas.length > 1} />
                  ))}
                </ul>

                {(pagina.previous || pagina.next) && (
                  <div className="flex items-center justify-between gap-4 border-t border-borda px-5 py-3.5">
                    <p className="text-[13px] text-texto-apagado tabular-nums">
                      {primeira}–{ultima} de {pagina.count}
                    </p>
                    <div className="flex gap-2">
                      {pagina.previous && (
                        <Link
                          href={paginaVizinha(consulta, numeroDaPagina - 1)}
                          className={botao("secundario", "sm")}
                        >
                          <CaretLeftIcon size={14} />
                          Anterior
                        </Link>
                      )}
                      {pagina.next && (
                        <Link
                          href={paginaVizinha(consulta, numeroDaPagina + 1)}
                          className={botao("secundario", "sm")}
                        >
                          Próxima
                          <CaretRightIcon size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Tour nome="financeiro" />
    </>
  );
}
