import { AlarmIcon, CalendarDotsIcon, ClockCountdownIcon, type Icon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import { diaEMes, diasEntre } from "@/lib/datas";

type Situacao = { icone: Icon; cor: string; curto: string; frase: string };

function situacaoDoPrazo(prazo: string, hoje: string): Situacao {
  const dias = diasEntre(hoje, prazo);

  if (dias === -1) {
    return { icone: AlarmIcon, cor: "text-perigo", curto: "Ontem", frase: "Venceu ontem" };
  }
  if (dias < -1) {
    return {
      icone: AlarmIcon,
      cor: "text-perigo",
      curto: `Há ${-dias} dias`,
      frase: `Venceu há ${-dias} dias`,
    };
  }
  if (dias === 0) {
    return { icone: ClockCountdownIcon, cor: "text-aviso", curto: "Hoje", frase: "Prazo hoje" };
  }
  if (dias === 1) {
    return { icone: CalendarDotsIcon, cor: "text-icone", curto: "Amanhã", frase: "Prazo amanhã" };
  }
  const data = diaEMes(prazo);
  return { icone: CalendarDotsIcon, cor: "text-icone", curto: data, frase: `Prazo ${data}` };
}

type Props = {
  prazo: string | null;
  hoje: string;
  encerrada: boolean;
  frase?: boolean;
  className?: string;
};

export function PrazoDaOrdem({ prazo, hoje, encerrada, frase = false, className }: Props) {
  if (!prazo || encerrada) {
    return frase ? null : <span className={juntar("text-texto-apagado", className)}>—</span>;
  }

  const situacao = situacaoDoPrazo(prazo, hoje);
  const Icone = situacao.icone;

  return (
    <span className={juntar("inline-flex items-center gap-1.5", className)}>
      <Icone size={14} className={juntar("shrink-0", situacao.cor)} />
      {frase ? situacao.frase : situacao.curto}
    </span>
  );
}
