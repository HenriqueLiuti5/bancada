import {
  ArrowUUpLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  FileXIcon,
  HandshakeIcon,
  HourglassIcon,
  PaperPlaneTiltIcon,
  PauseCircleIcon,
  ProhibitIcon,
  SealCheckIcon,
  StethoscopeIcon,
  ThumbsUpIcon,
  TrayIcon,
  TrendDownIcon,
  TruckIcon,
  WarningCircleIcon,
  WarningIcon,
  WrenchIcon,
  XCircleIcon,
  type Icon,
} from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";

type Grupo = "novo" | "andamento" | "espera" | "pronto" | "encerrado" | "recusado";

const STATUS: Record<string, { grupo: Grupo; icone: Icon }> = {
  recebido: { grupo: "novo", icone: TrayIcon },
  em_diagnostico: { grupo: "andamento", icone: StethoscopeIcon },
  aprovado: { grupo: "andamento", icone: ThumbsUpIcon },
  em_reparo: { grupo: "andamento", icone: WrenchIcon },
  orcamento_enviado: { grupo: "espera", icone: PaperPlaneTiltIcon },
  aguardando_peca: { grupo: "espera", icone: TruckIcon },
  pronto: { grupo: "pronto", icone: CheckCircleIcon },
  entregue: { grupo: "encerrado", icone: HandshakeIcon },
  devolvido_sem_reparo: { grupo: "encerrado", icone: ArrowUUpLeftIcon },
  reprovado: { grupo: "recusado", icone: XCircleIcon },
  teste: { grupo: "novo", icone: HourglassIcon },
  ativa: { grupo: "pronto", icone: SealCheckIcon },
  inadimplente: { grupo: "espera", icone: WarningIcon },
  suspensa: { grupo: "recusado", icone: PauseCircleIcon },
  cancelada: { grupo: "encerrado", icone: ProhibitIcon },
  aberta: { grupo: "espera", icone: ClockIcon },
  paga: { grupo: "pronto", icone: CheckCircleIcon },
  vencida: { grupo: "recusado", icone: WarningCircleIcon },
  estornada: { grupo: "encerrado", icone: ArrowUUpLeftIcon },
  sem_ordens: { grupo: "espera", icone: FileXIcon },
  parou: { grupo: "recusado", icone: TrendDownIcon },
};

const CORES: Record<Grupo, string> = {
  novo: "text-status-novo",
  andamento: "text-status-andamento",
  espera: "text-status-espera",
  pronto: "text-status-pronto",
  encerrado: "text-status-encerrado",
  recusado: "text-status-recusado",
};

function dadosDo(status: string) {
  const dados = STATUS[status] ?? { grupo: "encerrado" as const, icone: ClockIcon };
  return { ...dados, cor: CORES[dados.grupo] };
}

export function IconeDeStatus({ status, tamanho = 16 }: { status: string; tamanho?: number }) {
  const { icone: Icone, cor } = dadosDo(status);
  return <Icone size={tamanho} className={`shrink-0 ${cor}`} />;
}

export function CirculoDeStatus({
  status,
  apagado = false,
  className,
}: {
  status: string;
  apagado?: boolean;
  className?: string;
}) {
  const { icone: Icone, cor } = dadosDo(status);
  return (
    <span
      aria-hidden="true"
      className={juntar(
        "flex size-8 shrink-0 items-center justify-center rounded-full border bg-superficie",
        apagado ? "border-borda text-icone" : `border-current ${cor}`,
        className,
      )}
    >
      <Icone size={16} />
    </span>
  );
}

export function Selo({ status, rotulo }: { status: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-texto-suave">
      <IconeDeStatus status={status} />
      {rotulo}
    </span>
  );
}
