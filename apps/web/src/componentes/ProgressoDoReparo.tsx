import {
  ArrowUUpLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  FileTextIcon,
  HandshakeIcon,
  TrayIcon,
  WrenchIcon,
  XCircleIcon,
  type Icon,
} from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";

type Passo = { rotulo: string; status: string[]; icone: Icon };

const CAMINHO_DO_REPARO: Passo[] = [
  { rotulo: "Recebido", status: ["recebido"], icone: TrayIcon },
  { rotulo: "Orçamento", status: ["em_diagnostico", "orcamento_enviado"], icone: FileTextIcon },
  { rotulo: "Reparo", status: ["aprovado", "em_reparo", "aguardando_peca"], icone: WrenchIcon },
  { rotulo: "Pronto", status: ["pronto"], icone: CheckCircleIcon },
  { rotulo: "Entregue", status: ["entregue"], icone: HandshakeIcon },
];

const CAMINHO_SEM_REPARO: Passo[] = [
  { rotulo: "Recebido", status: ["recebido"], icone: TrayIcon },
  { rotulo: "Orçamento", status: ["em_diagnostico", "orcamento_enviado"], icone: FileTextIcon },
  { rotulo: "Recusado", status: ["reprovado"], icone: XCircleIcon },
  { rotulo: "Devolvido", status: ["devolvido_sem_reparo"], icone: ArrowUUpLeftIcon },
];

const STATUS_SEM_REPARO = ["reprovado", "devolvido_sem_reparo"];

const COLUNAS: Record<number, string> = { 4: "grid-cols-4", 5: "grid-cols-5" };

function caminhoDo(status: string): Passo[] {
  return STATUS_SEM_REPARO.includes(status) ? CAMINHO_SEM_REPARO : CAMINHO_DO_REPARO;
}

function Marcador({ passo, feito, atual }: { passo: Passo; feito: boolean; atual: boolean }) {
  const Icone = feito ? CheckIcon : passo.icone;
  return (
    <span
      className={juntar(
        "relative z-10 flex size-9 items-center justify-center rounded-full transition-colors",
        feito && "bg-primario text-primario-texto",
        atual && "bg-primario text-primario-texto ring-2 ring-primario ring-offset-2 ring-offset-superficie",
        !feito && !atual && "border border-borda-forte bg-superficie text-icone",
      )}
    >
      <Icone size={18} weight={feito ? "bold" : "regular"} />
    </span>
  );
}

export function ProgressoDoReparo({ status }: { status: string }) {
  const passos = caminhoDo(status);
  const atual = passos.findIndex((passo) => passo.status.includes(status));
  const ultimo = passos.length - 1;

  return (
    <ol aria-label="Andamento do reparo" className={juntar("grid", COLUNAS[passos.length])}>
      {passos.map((passo, indice) => {
        const feito = indice < atual || (indice === atual && indice === ultimo);
        const eAtual = indice === atual && !feito;
        return (
          <li
            key={passo.rotulo}
            aria-current={indice === atual ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {indice > 0 && (
              <span
                aria-hidden="true"
                className={juntar(
                  "absolute top-[17px] right-1/2 left-0 h-0.5",
                  indice <= atual ? "bg-primario" : "bg-borda",
                )}
              />
            )}
            {indice < ultimo && (
              <span
                aria-hidden="true"
                className={juntar(
                  "absolute top-[17px] right-0 left-1/2 h-0.5",
                  indice < atual ? "bg-primario" : "bg-borda",
                )}
              />
            )}
            <Marcador passo={passo} feito={feito} atual={eAtual} />
            <span
              className={juntar(
                "text-[11px] leading-tight sm:text-xs",
                indice === atual ? "font-semibold text-texto" : "font-medium text-texto-apagado",
              )}
            >
              {passo.rotulo}
              {feito && indice !== atual && <span className="sr-only"> (concluído)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
