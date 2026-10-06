import Link from "next/link";
import {
  ClockCountdownIcon,
  LockSimpleIcon,
  WarningCircleIcon,
  type Icon,
} from "@/componentes/icones";
import { Alerta } from "@/componentes/ui/Alerta";
import { botao } from "@/componentes/ui/estilos";
import { diaPorExtenso } from "@/lib/datas";
import type { ResumoDaAssinatura } from "@/lib/tipos";

const DIAS_PARA_LEMBRAR_DO_FIM_DO_TESTE = 7;

type Aviso = {
  icone: Icon;
  tom: "info" | "aviso" | "perigo";
  titulo: string;
  texto: string;
  acao?: string;
};

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
  const motivo = `${motivoDoBloqueio(assinatura)}.`;
  return {
    icone: LockSimpleIcon,
    tom: "perigo",
    titulo: "O Bancada está só para consulta",
    texto: eDono ? motivo : `${motivo} Fale com o dono da assistência.`,
    acao: eDono ? acaoDoDono(assinatura) : undefined,
  };
}

function avisoAoDono(assinatura: ResumoDaAssinatura): Aviso | null {
  if (assinatura.situacao === "inadimplente" && assinatura.pagar_ate) {
    return {
      icone: WarningCircleIcon,
      tom: "aviso",
      titulo: "A mensalidade venceu e ainda não foi paga",
      texto: `Pague até ${diaPorExtenso(assinatura.pagar_ate)} para o Bancada não ficar só para consulta.`,
      acao: "Pagar a fatura",
    };
  }

  if (
    assinatura.situacao === "teste" &&
    assinatura.dias_de_teste <= DIAS_PARA_LEMBRAR_DO_FIM_DO_TESTE
  ) {
    return {
      icone: ClockCountdownIcon,
      tom: "info",
      titulo: `Seu teste grátis termina ${quandoTermina(assinatura.dias_de_teste)}`,
      texto: "Assine para continuar editando depois disso.",
      acao: "Assinar",
    };
  }

  if (assinatura.situacao === "cancelada" && assinatura.acesso_ate) {
    return {
      icone: ClockCountdownIcon,
      tom: "aviso",
      titulo: "A assinatura foi cancelada",
      texto: `Você usa normalmente até ${diaPorExtenso(assinatura.acesso_ate)}; depois, o Bancada fica só para consulta.`,
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

  return (
    <Alerta
      tom={aviso.tom}
      icone={aviso.icone}
      titulo={aviso.titulo}
      className="mb-6"
      acao={
        aviso.acao && (
          <Link href="/assinatura" className={botao("primario", "sm")}>
            {aviso.acao}
          </Link>
        )
      }
    >
      {aviso.texto}
    </Alerta>
  );
}
