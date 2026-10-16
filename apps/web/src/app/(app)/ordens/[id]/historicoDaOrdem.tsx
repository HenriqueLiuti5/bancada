import { EnvelopeSimpleIcon, WalletIcon } from "@/componentes/icones";
import { Avatar } from "@/componentes/ui/Avatar";
import { CirculoDeStatus, IconeDeStatus } from "@/componentes/ui/Selo";
import { FUSO_HORARIO } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type { Evento, Ordem, Pagamento } from "@/lib/tipos";

type Registro =
  | { tipo: "evento"; momento: string; evento: Evento; pagamentos: Pagamento[] }
  | { tipo: "pagamento"; momento: string; pagamento: Pagamento };

function momentoEscrito(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_HORARIO,
  });
}

function registrosDa(ordem: Ordem): Registro[] {
  const naEntrega = (pagamento: Pagamento) => pagamento.recebido_em === ordem.entregue_em;

  const registros: Registro[] = [
    ...ordem.eventos.map((evento) => ({
      tipo: "evento" as const,
      momento: evento.criado_em,
      evento,
      pagamentos: evento.para_status === "entregue" ? ordem.pagamentos.filter(naEntrega) : [],
    })),
    ...ordem.pagamentos
      .filter((pagamento) => !naEntrega(pagamento))
      .map((pagamento) => ({ tipo: "pagamento" as const, momento: pagamento.recebido_em, pagamento })),
  ];

  return registros.sort((um, outro) => Date.parse(outro.momento) - Date.parse(um.momento));
}

function Valores({ pagamentos }: { pagamentos: Pagamento[] }) {
  return pagamentos.map((pagamento, indice) => (
    <span key={pagamento.id}>
      {indice > 0 && ", "}
      <span className="font-semibold text-dinheiro tabular-nums">{emReais(pagamento.valor)}</span> em{" "}
      {pagamento.forma_rotulo}
    </span>
  ));
}

function Linha({
  autor,
  marcador,
  momento,
  acao,
  children,
}: {
  autor: string | null;
  marcador: React.ReactNode;
  momento: string;
  acao: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 px-5 py-4">
      {autor ? <Avatar nome={autor} /> : marcador}
      <div className="min-w-0 flex-1 space-y-2 pt-1.5">
        <p className="text-sm leading-relaxed">
          <strong className="font-semibold">{autor ?? "A equipe"}</strong> {acao}
          <span className="text-texto-apagado"> · {momentoEscrito(momento)}</span>
        </p>
        {children}
      </div>
    </li>
  );
}

function LinhaDoEvento({
  evento,
  pagamentos,
  problema,
}: {
  evento: Evento;
  pagamentos: Pagamento[];
  problema: string;
}) {
  const abertura = !evento.de_status;
  const nota = abertura ? problema : evento.nota;
  const acao = abertura ? (
    "abriu a ordem"
  ) : (
    <>
      mudou para{" "}
      <span className="inline-flex items-center gap-1 align-bottom font-semibold">
        <IconeDeStatus status={evento.para_status} />
        {evento.para_label}
      </span>
    </>
  );

  return (
    <Linha
      autor={evento.usuario}
      marcador={<CirculoDeStatus status={evento.para_status} className="size-9" />}
      momento={evento.criado_em}
      acao={acao}
    >
      {nota && (
        <p className="rounded-xl bg-realce px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {nota}
        </p>
      )}
      {pagamentos.length > 0 && (
        <p className="text-[13px] text-texto-suave sm:text-xs">
          Pago na entrega: <Valores pagamentos={pagamentos} />
        </p>
      )}
      {evento.aviso && (
        <p className="flex items-center gap-1.5 text-[13px] text-texto-apagado sm:text-xs">
          <EnvelopeSimpleIcon size={14} className="shrink-0 text-destaque" />
          Cliente avisado em {evento.aviso.destino}
        </p>
      )}
    </Linha>
  );
}

function LinhaDoPagamento({ pagamento }: { pagamento: Pagamento }) {
  return (
    <Linha
      autor={pagamento.registrado_por}
      marcador={
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-borda-forte text-icone">
          <WalletIcon size={16} />
        </span>
      }
      momento={pagamento.recebido_em}
      acao={
        <>
          registrou um pagamento de <Valores pagamentos={[pagamento]} />
        </>
      }
    />
  );
}

export function HistoricoDaOrdem({ ordem }: { ordem: Ordem }) {
  return (
    <>
      <ol className="divide-y divide-borda">
        {registrosDa(ordem).map((registro) =>
          registro.tipo === "evento" ? (
            <LinhaDoEvento
              key={`evento-${registro.evento.id}`}
              evento={registro.evento}
              pagamentos={registro.pagamentos}
              problema={ordem.problema_relatado}
            />
          ) : (
            <LinhaDoPagamento key={`pagamento-${registro.pagamento.id}`} pagamento={registro.pagamento} />
          ),
        )}
      </ol>
      <p className="border-t border-borda px-5 py-3 text-[13px] text-texto-apagado sm:text-xs">
        As mudanças de etapa ficam registradas com quem fez e quando, e não podem ser apagadas.
      </p>
    </>
  );
}
