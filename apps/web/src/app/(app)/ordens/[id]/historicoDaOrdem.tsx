import {
  ChatCircleTextIcon,
  EnvelopeSimpleIcon,
  UserSwitchIcon,
  WalletIcon,
  type Icon,
} from "@/componentes/icones";
import { Avatar } from "@/componentes/ui/Avatar";
import { CirculoDeStatus, IconeDeStatus } from "@/componentes/ui/Selo";
import { diaEHora } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type { Evento, Ordem, Pagamento, RegistroDaOrdem } from "@/lib/tipos";
import { NovoComentario } from "./novoComentario";

type Entrada =
  | { tipo: "evento"; momento: string; evento: Evento; pagamentos: Pagamento[] }
  | { tipo: "pagamento"; momento: string; pagamento: Pagamento }
  | { tipo: "registro"; momento: string; registro: RegistroDaOrdem };

function entradasDa(ordem: Ordem): Entrada[] {
  const naEntrega = (pagamento: Pagamento) => pagamento.recebido_em === ordem.entregue_em;

  const entradas: Entrada[] = [
    ...ordem.eventos.map((evento) => ({
      tipo: "evento" as const,
      momento: evento.criado_em,
      evento,
      pagamentos: evento.para_status === "entregue" ? ordem.pagamentos.filter(naEntrega) : [],
    })),
    ...ordem.pagamentos
      .filter((pagamento) => !naEntrega(pagamento))
      .map((pagamento) => ({ tipo: "pagamento" as const, momento: pagamento.recebido_em, pagamento })),
    ...ordem.registros.map((registro) => ({
      tipo: "registro" as const,
      momento: registro.criado_em,
      registro,
    })),
  ];

  return entradas.sort((uma, outra) => Date.parse(outra.momento) - Date.parse(uma.momento));
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

function Marcador({ icone: Icone }: { icone: Icon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-borda-forte text-icone">
      <Icone size={16} />
    </span>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-realce px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
      {children}
    </p>
  );
}

function Linha({
  autor,
  marcador,
  quando,
  acao,
  children,
}: {
  autor: string | null;
  marcador: React.ReactNode;
  quando: string;
  acao: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 px-5 py-4">
      {autor ? <Avatar nome={autor} /> : marcador}
      <div className="min-w-0 flex-1 space-y-2 pt-1.5">
        <p className="text-sm leading-relaxed">
          <strong className="font-semibold">{autor ?? "A equipe"}</strong> {acao}
          <span className="text-texto-apagado"> · {quando}</span>
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
  quando,
}: {
  evento: Evento;
  pagamentos: Pagamento[];
  problema: string;
  quando: string;
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
      quando={quando}
      acao={acao}
    >
      {nota && <Texto>{nota}</Texto>}
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

function LinhaDoPagamento({ pagamento, quando }: { pagamento: Pagamento; quando: string }) {
  return (
    <Linha
      autor={pagamento.registrado_por}
      marcador={<Marcador icone={WalletIcon} />}
      quando={quando}
      acao={
        <>
          registrou um pagamento de <Valores pagamentos={[pagamento]} />
        </>
      }
    />
  );
}

function LinhaDoRegistro({ registro, quando }: { registro: RegistroDaOrdem; quando: string }) {
  const comentario = registro.tipo === "comentario";

  return (
    <Linha
      autor={registro.usuario}
      marcador={<Marcador icone={comentario ? ChatCircleTextIcon : UserSwitchIcon} />}
      quando={quando}
      acao={comentario ? "comentou" : "trocou o cliente"}
    >
      <Texto>{registro.texto}</Texto>
    </Linha>
  );
}

function LinhaDaEntrada({
  entrada,
  problema,
  fuso,
}: {
  entrada: Entrada;
  problema: string;
  fuso: string;
}) {
  const quando = diaEHora(entrada.momento, fuso);
  if (entrada.tipo === "evento") {
    return (
      <LinhaDoEvento
        evento={entrada.evento}
        pagamentos={entrada.pagamentos}
        problema={problema}
        quando={quando}
      />
    );
  }
  if (entrada.tipo === "pagamento") return <LinhaDoPagamento pagamento={entrada.pagamento} quando={quando} />;
  return <LinhaDoRegistro registro={entrada.registro} quando={quando} />;
}

function chaveDa(entrada: Entrada): string {
  if (entrada.tipo === "evento") return `evento-${entrada.evento.id}`;
  if (entrada.tipo === "pagamento") return `pagamento-${entrada.pagamento.id}`;
  return `registro-${entrada.registro.id}`;
}

export function HistoricoDaOrdem({ ordem, fuso }: { ordem: Ordem; fuso: string }) {
  return (
    <>
      <NovoComentario id={ordem.id} />
      <ol className="divide-y divide-borda">
        {entradasDa(ordem).map((entrada) => (
          <LinhaDaEntrada
            key={chaveDa(entrada)}
            entrada={entrada}
            problema={ordem.problema_relatado}
            fuso={fuso}
          />
        ))}
      </ol>
      <p className="border-t border-borda px-5 py-3 text-[13px] text-texto-apagado sm:text-xs">
        As mudanças de etapa e os comentários ficam registrados com quem fez e quando, e não podem ser
        apagados. O cliente não vê os comentários.
      </p>
    </>
  );
}
