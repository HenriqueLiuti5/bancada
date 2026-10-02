import { CalendarClock, CircleAlert, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { botao } from "@/componentes/ui/estilos";
import { diaPorExtenso } from "@/lib/datas";
import type { ResumoDaAssinatura } from "@/lib/tipos";

const DIAS_PARA_LEMBRAR_DO_FIM_DO_TESTE = 7;

type Aviso = { icone: LucideIcon; cor: string; texto: string; acao?: string };

function quandoTermina(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

function motivoDoBloqueio(assinatura: ResumoDaAssinatura): string {
  if (assinatura.situacao === "cancelada") return "A assinatura foi cancelada";
  if (assinatura.contratada) return "A mensalidade está atrasada há mais de 7 dias";
  return `O teste grátis terminou em ${diaPorExtenso(assinatura.teste_termina_em)}`;
}

function acaoDoDono(assinatura: ResumoDaAssinatura): string {
  if (assinatura.situacao === "cancelada") return "Assinar de novo";
  return assinatura.contratada ? "Pagar a fatura" : "Assinar";
}

function avisoDeSoConsulta(assinatura: ResumoDaAssinatura, eDono: boolean): Aviso {
  const texto = `${motivoDoBloqueio(assinatura)}, então o Bancada está só para consulta.`;
  return {
    icone: Lock,
    cor: "text-perigo-forte",
    texto: eDono ? texto : `${texto} Fale com o dono da assistência.`,
    acao: eDono ? acaoDoDono(assinatura) : undefined,
  };
}

function avisoAoDono(assinatura: ResumoDaAssinatura): Aviso | null {
  if (assinatura.situacao === "inadimplente" && assinatura.pagar_ate) {
    return {
      icone: CircleAlert,
      cor: "text-status-espera",
      texto: `A mensalidade venceu e ainda não foi paga. Pague até ${diaPorExtenso(assinatura.pagar_ate)} para o Bancada não ficar só para consulta.`,
      acao: "Pagar a fatura",
    };
  }

  if (
    assinatura.situacao === "teste" &&
    assinatura.dias_de_teste <= DIAS_PARA_LEMBRAR_DO_FIM_DO_TESTE
  ) {
    return {
      icone: CalendarClock,
      cor: "text-status-espera",
      texto: `Seu teste grátis termina ${quandoTermina(assinatura.dias_de_teste)}. Assine para continuar editando depois disso.`,
      acao: "Assinar",
    };
  }

  if (assinatura.situacao === "cancelada" && assinatura.acesso_ate) {
    return {
      icone: CalendarClock,
      cor: "text-status-espera",
      texto: `A assinatura foi cancelada. Você usa normalmente até ${diaPorExtenso(assinatura.acesso_ate)}; depois, o Bancada fica só para consulta.`,
      acao: "Assinar de novo",
    };
  }

  return null;
}

function avisoPara(assinatura: ResumoDaAssinatura, eDono: boolean): Aviso | null {
  if (!assinatura.pode_editar) return avisoDeSoConsulta(assinatura, eDono);
  return eDono ? avisoAoDono(assinatura) : null;
}

type Props = { assinatura: ResumoDaAssinatura; eDono: boolean };

export function AvisoDaAssinatura({ assinatura, eDono }: Props) {
  const aviso = avisoPara(assinatura, eDono);
  if (!aviso) return null;

  const Icone = aviso.icone;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-sutil">
      <Icone size={16} strokeWidth={1.75} className={`shrink-0 ${aviso.cor}`} />
      <p className="min-w-0 flex-1 text-[13px] text-texto-suave">{aviso.texto}</p>
      {aviso.acao && (
        <Link href="/assinatura" className={botao("secundario", "sm")}>
          {aviso.acao}
        </Link>
      )}
    </div>
  );
}
