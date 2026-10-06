import Link from "next/link";
import {
  CheckCircleIcon,
  CreditCardIcon,
  FilePlusIcon,
  ListChecksIcon,
  MapPinIcon,
  PaperPlaneTiltIcon,
  UserPlusIcon,
  type Icon,
} from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { botao, juntar } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import type { PrimeirosPassos as Situacao } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { esconderPrimeirosPassos } from "./acoes";

type Texto = {
  icone: Icon;
  titulo: string;
  dica: string;
  acao: string;
  destino: (situacao: Situacao) => string | null;
};

const TEXTOS: Record<string, Texto> = {
  "abrir-ordem": {
    icone: FilePlusIcon,
    titulo: "Abrir a primeira ordem de serviço",
    dica: "Cliente, aparelho e defeito numa tela só, ali no balcão.",
    acao: "Nova ordem",
    destino: () => "/ordens/nova",
  },
  "mandar-link": {
    icone: PaperPlaneTiltIcon,
    titulo: "Mandar o link de acompanhamento ao cliente",
    dica: "Na tela da ordem, use o botão WhatsApp do cartão Link do cliente. Se o cliente tiver e-mail, o link vai sozinho.",
    acao: "Abrir a última ordem",
    destino: ({ ordem_mais_recente }) =>
      ordem_mais_recente ? `/ordens/${ordem_mais_recente}` : null,
  },
  "endereco-da-loja": {
    icone: MapPinIcon,
    titulo: "Completar o endereço da loja",
    dica: "Ele sai no comprovante que o cliente assina e no recibo de entrega.",
    acao: "Completar",
    destino: () => "/assistencia",
  },
  "convidar-equipe": {
    icone: UserPlusIcon,
    titulo: "Convidar a equipe",
    dica: "Cada pessoa entra com o próprio e-mail e senha. Se você trabalha sozinho, pode esconder esta lista.",
    acao: "Convidar",
    destino: () => "/equipe",
  },
  assinar: {
    icone: CreditCardIcon,
    titulo: "Assinar o Bancada",
    dica: "Assinando durante o teste você não perde nenhum dia grátis: a primeira mensalidade só vence quando o teste acabar.",
    acao: "Assinar",
    destino: () => "/assinatura",
  },
};

export async function PrimeirosPassos() {
  const usuario = await usuarioAtual();
  if (!gerenciaEquipe(usuario) || usuario.primeiros_passos_escondidos) return null;

  const situacao = await chamarApi<Situacao>("/api/orientacao/primeiros-passos/");
  const feitos = situacao.passos.filter((passo) => passo.feito).length;
  const total = situacao.passos.length;
  const tudoPronto = feitos === total;

  return (
    <Cartao
      tour="primeiros-passos"
      className="mb-6"
      icone={ListChecksIcon}
      titulo={tudoPronto ? "Tudo pronto" : "Primeiros passos"}
      descricao={
        tudoPronto
          ? "A assistência está configurada. Bom trabalho!"
          : `${feitos} de ${total} concluídos`
      }
      acoes={
        <form action={esconderPrimeirosPassos}>
          <button type="submit" className={botao("fantasma", "sm")}>
            {tudoPronto ? "Fechar" : "Esconder"}
          </button>
        </form>
      }
      semEspaco
    >
      <div
        role="progressbar"
        aria-label="Primeiros passos concluídos"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={feitos}
        className="mx-5 mt-4 mb-1 h-2 overflow-hidden rounded-full bg-realce"
      >
        <div
          className="h-full rounded-full bg-grafico transition-[width] duration-300"
          style={{ width: `${(feitos / total) * 100}%` }}
        />
      </div>
      <ul className="divide-y divide-borda">
        {situacao.passos.map((passo) => {
          const texto = TEXTOS[passo.chave];
          if (!texto) return null;
          const Icone = texto.icone;
          const href = passo.feito ? null : texto.destino(situacao);

          return (
            <li key={passo.chave} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              {passo.feito ? (
                <CheckCircleIcon size={24} weight="fill" className="shrink-0 text-sucesso" />
              ) : (
                <Icone size={24} className="shrink-0 text-icone" />
              )}

              <div className="min-w-0 flex-1 basis-48">
                <p
                  className={juntar(
                    "text-sm",
                    passo.feito ? "font-medium text-texto-apagado line-through decoration-borda-forte" : "font-semibold",
                  )}
                >
                  {texto.titulo}
                </p>
                {!passo.feito && <p className="mt-0.5 text-[13px] text-texto-apagado">{texto.dica}</p>}
              </div>

              {href && (
                <Link href={href} className={juntar(botao("secundario", "sm"), "ml-10 shrink-0 sm:ml-0")}>
                  {texto.acao}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
