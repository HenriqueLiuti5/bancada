import Link from "next/link";
import { redirect } from "next/navigation";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import {
  AlarmIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  HandCoinsIcon,
  MagnifyingGlassIcon,
  WalletIcon,
} from "@/componentes/icones";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import { ErroDaApi, chamarApi } from "@/lib/api";
import { hojeEmIso } from "@/lib/datas";
import { situacaoDoAReceber } from "@/lib/financeiro";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { ContaAReceber, Loja, Pagina, ResumoDoAReceber } from "@/lib/tipos";
import { fusoDaAssistencia, gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { Tour } from "../../tour";
import { CabecalhoDoFinanceiro } from "../cabecalho";
import { MarcaDoPrazo } from "../vencimento";

export const dynamic = "force-dynamic";

const ENDERECO = "/financeiro/a-receber";
const FILTROS = ["busca", "situacao"] as const;
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
  return texto ? `${ENDERECO}?${texto}` : ENDERECO;
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

async function buscarContas(consulta: URLSearchParams): Promise<Pagina<ContaAReceber> | null> {
  try {
    return await chamarApi<Pagina<ContaAReceber>>(`/api/contas-a-receber/?${consulta}`);
  } catch (erro) {
    if (erro instanceof ErroDaApi && erro.status === 404) return null;
    throw erro;
  }
}

function ResumoDoTopo({ resumo }: { resumo: ResumoDoAReceber }) {
  const { vencidas, proximos_dias: proximas, recebido_no_mes: recebido } = resumo;

  return (
    <GradeDeIndicadores tour="resumo-do-a-receber" colunas={3}>
      <Indicador
        rotulo="Vencidas"
        icone={AlarmIcon}
        valor={emReais(vencidas.valor)}
        dinheiro
        alerta={vencidas.ordens > 0}
        nota={
          vencidas.ordens > 0
            ? `${contagem(vencidas.ordens, "ordem passou", "ordens passaram")} do dia combinado`
            : "nada atrasado"
        }
        href={vencidas.ordens > 0 ? `${ENDERECO}?situacao=vencidas` : undefined}
      />
      <Indicador
        rotulo="Vencem em 7 dias"
        icone={CalendarDotsIcon}
        valor={emReais(proximas.valor)}
        dinheiro
        nota={contagem(proximas.ordens, "ordem", "ordens")}
      />
      <Indicador
        rotulo="Recebido neste mês"
        icone={WalletIcon}
        valor={emReais(recebido.valor)}
        dinheiro
        nota={contagem(recebido.ordens, "ordem", "ordens")}
        href={recebido.ordens > 0 ? `${ENDERECO}?situacao=recebidas` : undefined}
      />
    </GradeDeIndicadores>
  );
}

function Busca({ busca, situacao }: { busca: string; situacao: string }) {
  return (
    <form action={ENDERECO} className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
      {situacao && <input type="hidden" name="situacao" value={situacao} />}
      <div className="relative min-w-0 sm:flex-1 sm:basis-72">
        <MagnifyingGlassIcon
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-apagado"
        />
        <input
          name="busca"
          type="search"
          enterKeyHint="search"
          aria-label="Buscar contas a receber"
          defaultValue={busca}
          placeholder="Buscar pelo cliente, aparelho ou número da OS"
          className={juntar(campo, "pl-10")}
        />
      </div>
      <button type="submit" className={juntar(botao("secundario"), "max-sm:hidden")}>
        Buscar
      </button>
    </form>
  );
}

function SemContas({ situacao, buscando }: { situacao: string; buscando: boolean }) {
  if (buscando) {
    return (
      <EstadoVazio
        icone={MagnifyingGlassIcon}
        titulo="Nenhuma ordem com essa busca"
        descricao="Tente o nome do cliente, o aparelho ou o número da OS."
        acao={
          <Link href={comSituacao(new URLSearchParams(), situacao || null)} className={botao("secundario", "sm")}>
            Limpar busca
          </Link>
        }
      />
    );
  }
  if (situacao === "vencidas") {
    return (
      <EstadoVazio
        icone={CheckCircleIcon}
        titulo="Nenhum pagamento vencido"
        descricao="Quem ficou devendo ainda está dentro do dia combinado."
      />
    );
  }
  if (situacao === "recebidas") {
    return (
      <EstadoVazio
        icone={WalletIcon}
        titulo="Nenhuma conta recebida ainda"
        descricao="As ordens que o cliente terminou de pagar depois da entrega aparecem aqui, da mais recente para a mais antiga."
      />
    );
  }
  return (
    <EstadoVazio
      icone={HandCoinsIcon}
      titulo="Ninguém está devendo"
      descricao="Quando uma ordem é entregue com parte do valor para depois, ela aparece aqui com o dia combinado para pagar."
    />
  );
}

function LinhaDaConta({
  conta,
  hoje,
  fuso,
  variasLojas,
}: {
  conta: ContaAReceber;
  hoje: string;
  fuso: string;
  variasLojas: boolean;
}) {
  const recebida = conta.quitada_em !== null;
  const pagouUmaParte = !recebida && Number(conta.valor_pago) > 0;
  const detalhe = [
    `OS #${conta.numero}`,
    conta.aparelho_descricao,
    variasLojas ? conta.loja_nome : "",
    pagouUmaParte ? `pagou ${emReais(conta.valor_pago)} de ${emReais(conta.valor_cobrado)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const situacao = situacaoDoAReceber(conta, hoje, fuso);

  return (
    <li>
      <Link
        href={`/ordens/${conta.id}`}
        className={`${COLUNAS} grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-4 py-3.5 transition-colors duration-150 hover:bg-realce sm:px-5`}
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold sm:text-sm">{conta.cliente_nome}</span>
          <span className="block truncate text-sm text-texto-apagado sm:text-[13px]">{detalhe}</span>
        </span>
        <span className="text-right text-[15px] font-semibold text-dinheiro tabular-nums sm:order-last sm:text-sm">
          {emReais(recebida ? conta.valor_cobrado : conta.saldo)}
        </span>
        <span className="col-span-2 text-[13px] text-texto-suave sm:col-span-1">
          <MarcaDoPrazo situacao={situacao} texto={situacao.curto} />
        </span>
      </Link>
    </li>
  );
}

export default async function ContasAReceber({ searchParams }: { searchParams: Promise<Parametros> }) {
  const recebidos = await searchParams;
  const usuario = await usuarioAtual();
  if (!gerenciaEquipe(usuario)) redirect("/financeiro");

  const fuso = fusoDaAssistencia(usuario);
  const hoje = hojeEmIso(fuso);
  const consulta = lerParametros(recebidos);
  const [pagina, resumo, lojas] = await Promise.all([
    buscarContas(consulta),
    chamarApi<ResumoDoAReceber>("/api/contas-a-receber/resumo/"),
    chamarApi<Loja[]>("/api/lojas/"),
  ]);
  if (pagina === null) redirect(paginaVizinha(consulta, 1));

  const busca = consulta.get("busca") ?? "";
  const situacao = consulta.get("situacao") ?? "";
  const recebidas = situacao === "recebidas";
  const numeroDaPagina = Number(consulta.get("page") ?? "1");
  const primeira = (numeroDaPagina - 1) * POR_PAGINA + 1;
  const ultima = Math.min(numeroDaPagina * POR_PAGINA, pagina.count);

  return (
    <>
      <CabecalhoDoFinanceiro
        ativa="a_receber"
        titulo="Contas a receber"
        descricao="O que os clientes ficaram devendo nas ordens entregues, com o dia combinado que vence primeiro no alto. Só quem é dono vê esta tela."
      />

      <div className="space-y-6">
        <ResumoDoTopo resumo={resumo} />

        <div className="space-y-4">
          <Segmentos>
            <Segmento href={comSituacao(consulta, null)} ativo={!situacao}>
              A receber
            </Segmento>
            <Segmento href={comSituacao(consulta, "vencidas")} ativo={situacao === "vencidas"}>
              Vencidas
            </Segmento>
            <Segmento href={comSituacao(consulta, "recebidas")} ativo={recebidas}>
              Recebidas
            </Segmento>
          </Segmentos>

          <Busca busca={busca} situacao={situacao} />

          <div
            data-tour="lista-do-a-receber"
            className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao"
          >
            {pagina.results.length === 0 ? (
              <SemContas situacao={situacao} buscando={Boolean(busca)} />
            ) : (
              <>
                <div
                  className={`${COLUNAS} hidden border-b border-borda px-5 py-3 text-xs font-semibold text-texto-apagado`}
                >
                  <span>Cliente</span>
                  <span>{recebidas ? "Recebido" : "Dia combinado"}</span>
                  <span className="text-right">{recebidas ? "Valor" : "Falta"}</span>
                </div>

                <ul className="divide-y divide-borda">
                  {pagina.results.map((conta) => (
                    <LinhaDaConta
                      key={conta.id}
                      conta={conta}
                      hoje={hoje}
                      fuso={fuso}
                      variasLojas={lojas.length > 1}
                    />
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

      <Tour nome="a-receber" />
    </>
  );
}
