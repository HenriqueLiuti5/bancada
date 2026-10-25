import {
  AlarmIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  QuestionIcon,
  type Icon,
} from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import {
  situacaoDoVencimento,
  type SituacaoDoVencimento,
  type TomDoVencimento,
} from "@/lib/financeiro";
import type { ContaAPagar } from "@/lib/tipos";

const APARENCIA: Record<TomDoVencimento, { icone: Icon; cor: string }> = {
  vencida: { icone: AlarmIcon, cor: "text-perigo" },
  hoje: { icone: ClockCountdownIcon, cor: "text-aviso" },
  futura: { icone: CalendarDotsIcon, cor: "text-icone" },
  paga: { icone: CheckCircleIcon, cor: "text-sucesso" },
  sem_data: { icone: QuestionIcon, cor: "text-icone" },
};

export function MarcaDoPrazo({
  situacao,
  texto,
  className,
}: {
  situacao: SituacaoDoVencimento;
  texto: string;
  className?: string;
}) {
  const { icone: Icone, cor } = APARENCIA[situacao.tom];

  return (
    <span className={juntar("inline-flex items-center gap-1.5", className)}>
      <Icone size={14} className={juntar("shrink-0", cor)} />
      {texto}
    </span>
  );
}

type Props = {
  conta: Pick<ContaAPagar, "vencimento" | "paga_em" | "forma_rotulo">;
  hoje: string;
  frase?: boolean;
  className?: string;
};

export function VencimentoDaConta({ conta, hoje, frase = false, className }: Props) {
  const situacao = situacaoDoVencimento(conta, hoje);
  const texto = frase ? situacao.frase : situacao.curto;
  const comForma = situacao.tom === "paga" && conta.forma_rotulo;

  return (
    <MarcaDoPrazo
      situacao={situacao}
      texto={comForma ? `${texto} · ${conta.forma_rotulo}` : texto}
      className={className}
    />
  );
}
