import { ArrowRight, Circle, CircleCheck } from "lucide-react";
import Link from "next/link";
import { Cartao } from "@/componentes/ui/Cartao";
import { botao, juntar } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import type { PrimeirosPassos as Situacao } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { esconderPrimeirosPassos } from "./acoes";

type Texto = {
  titulo: string;
  dica: string;
  acao: string;
  destino: (situacao: Situacao) => string | null;
};

const TEXTOS: Record<string, Texto> = {
  "abrir-ordem": {
    titulo: "Abrir a primeira ordem de serviço",
    dica: "Cliente, aparelho e defeito numa tela só, ali no balcão.",
    acao: "Nova ordem",
    destino: () => "/ordens/nova",
  },
  "mandar-link": {
    titulo: "Mandar o link de acompanhamento ao cliente",
    dica: "Na tela da ordem, use o botão WhatsApp do cartão Link do cliente. Se o cliente tiver e-mail, o link vai sozinho.",
    acao: "Abrir a última ordem",
    destino: ({ ordem_mais_recente }) =>
      ordem_mais_recente ? `/ordens/${ordem_mais_recente}` : null,
  },
  "endereco-da-loja": {
    titulo: "Completar o endereço da loja",
    dica: "Ele sai no comprovante que o cliente assina e no recibo de entrega.",
    acao: "Completar",
    destino: () => "/assistencia",
  },
  "convidar-equipe": {
    titulo: "Convidar a equipe",
    dica: "Cada pessoa entra com o próprio e-mail e senha. Se você trabalha sozinho, pode esconder esta lista.",
    acao: "Convidar",
    destino: () => "/equipe",
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
      <ul className="divide-y divide-borda">
        {situacao.passos.map((passo) => {
          const texto = TEXTOS[passo.chave];
          if (!texto) return null;
          const href = passo.feito ? null : texto.destino(situacao);

          return (
            <li key={passo.chave} className="flex items-start gap-3 px-5 py-3">
              {passo.feito ? (
                <CircleCheck size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-sucesso" />
              ) : (
                <Circle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-texto-apagado" />
              )}

              <div className="min-w-0 flex-1">
                <p className={juntar("text-sm", passo.feito ? "text-texto-suave" : "font-medium")}>
                  {texto.titulo}
                </p>
                {!passo.feito && <p className="mt-0.5 text-[13px] text-texto-suave">{texto.dica}</p>}
              </div>

              {href && (
                <Link href={href} className={juntar(botao("secundario", "sm"), "shrink-0")}>
                  {texto.acao}
                  <ArrowRight size={14} strokeWidth={2} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
