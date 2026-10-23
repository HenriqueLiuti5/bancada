import {
  AlarmIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  type Icon,
} from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import { situacaoDoVencimento, type TomDoVencimento } from "@/lib/financeiro";
import type { ContaAPagar } from "@/lib/tipos";

const APARENCIA: Record<TomDoVencimento, { icone: Icon; cor: string }> = {
  vencida: { icone: AlarmIcon, cor: "text-perigo" },
  hoje: { icone: ClockCountdownIcon, cor: "text-aviso" },
  futura: { icone: CalendarDotsIcon, cor: "text-icone" },
  paga: { icone: CheckCircleIcon, cor: "text-sucesso" },
};

type Props = {
  conta: Pick<ContaAPagar, "vencimento" | "paga_em" | "forma_rotulo">;
  hoje: string;
  frase?: boolean;
  className?: string;
};

export function VencimentoDaConta({ conta, hoje, frase = false, className }: Props) {
  const situacao = situacaoDoVencimento(conta, hoje);
  const { icone: Icone, cor } = APARENCIA[situacao.tom];
  const texto = frase ? situacao.frase : situacao.curto;
  const comForma = situacao.tom === "paga" && conta.forma_rotulo;

  return (
    <span className={juntar("inline-flex items-center gap-1.5", className)}>
      <Icone size={14} className={juntar("shrink-0", cor)} />
      {comForma ? `${texto} · ${conta.forma_rotulo}` : texto}
    </span>
  );
}
