import { ArrowSquareOutIcon, ReceiptIcon, SealCheckIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { dataCurta, diaPorExtenso } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type { Assistencia, DetalheDaAssinatura, Fatura } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { CancelamentoDaAssinatura, FormularioDeAssinatura } from "./formularios";

export const dynamic = "force-dynamic";

const EM_ABERTO = new Set(["aberta", "vencida"]);

function explicacaoDaAssinatura(assinatura: DetalheDaAssinatura): string {
  const valor = emReais(assinatura.valor_mensal);
  const fimDoTeste = diaPorExtenso(assinatura.teste_termina_em);
  const primeiroVencimento = diaPorExtenso(assinatura.primeiro_vencimento);

  switch (assinatura.situacao) {
    case "teste":
      return `Você está no teste grátis até ${fimDoTeste}. Assinando agora, nada é cobrado antes disso: a primeira mensalidade, de ${valor}, vence em ${primeiroVencimento}.`;
    case "ativa":
      return assinatura.em_teste
        ? `Assinatura feita. O teste grátis continua até ${fimDoTeste}, e a primeira mensalidade vence nesse dia.`
        : `Tudo em dia. A mensalidade é de ${valor}, e o Asaas manda a fatura por e-mail antes de cada vencimento.`;
    case "inadimplente":
      return `A mensalidade está atrasada. Pague até ${diaPorExtenso(assinatura.pagar_ate ?? assinatura.primeiro_vencimento)} para o Bancada não ficar só para consulta.`;
    case "suspensa":
      return assinatura.contratada
        ? "A mensalidade está atrasada há mais de 7 dias, então o Bancada está só para consulta. Assim que o pagamento for confirmado, tudo volta ao normal."
        : `O teste grátis terminou em ${fimDoTeste}. As ordens e os clientes continuam aqui, só para consulta. Assinando, você volta a editar na hora, e a primeira mensalidade vence em ${primeiroVencimento}.`;
    case "cancelada":
      return assinatura.pode_editar && assinatura.acesso_ate
        ? `A assinatura foi cancelada. Você usa normalmente até ${diaPorExtenso(assinatura.acesso_ate)}; depois, o Bancada fica só para consulta. Para continuar, é só assinar de novo.`
        : "A assinatura foi cancelada, e o Bancada está só para consulta. Assinando de novo, você volta a editar na hora.";
  }
}

function faturaAPagar(faturas: Fatura[]): Fatura | undefined {
  return faturas.findLast(
    (fatura) => EM_ABERTO.has(fatura.situacao) && fatura.link_de_pagamento,
  );
}

function BotaoDaFatura({ fatura, atrasada }: { fatura: Fatura; atrasada: boolean }) {
  return (
    <a
      href={fatura.link_de_pagamento}
      target="_blank"
      rel="noopener noreferrer"
      className={botao(atrasada ? "primario" : "secundario")}
    >
      {atrasada ? "Pagar a fatura" : "Ver a próxima fatura"}
      <ArrowSquareOutIcon size={14} />
    </a>
  );
}

function LinhaDaFatura({ fatura }: { fatura: Fatura }) {
  const pagamento = fatura.paga_em
    ? ` · paga em ${dataCurta(fatura.paga_em)}${fatura.forma_de_pagamento ? ` (${fatura.forma_rotulo})` : ""}`
    : "";

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tabular-nums">{emReais(fatura.valor)}</p>
        <p className="text-[13px] text-texto-apagado">
          Vence em {dataCurta(fatura.vencimento)}
          {pagamento}
        </p>
      </div>
      <Selo status={fatura.situacao} rotulo={fatura.situacao_rotulo} />
      {fatura.link_de_pagamento && (
        <a
          href={fatura.link_de_pagamento}
          target="_blank"
          rel="noopener noreferrer"
          className={botao("fantasma", "sm")}
        >
          {EM_ABERTO.has(fatura.situacao) ? "Pagar" : "Ver"}
          <ArrowSquareOutIcon size={13} />
        </a>
      )}
    </li>
  );
}

export default async function PaginaDaAssinatura() {
  const usuario = await usuarioAtual();

  if (!gerenciaEquipe(usuario)) {
    return (
      <CabecalhoDaPagina
        titulo="Assinatura"
        descricao="Só o dono vê e altera a assinatura da assistência."
      />
    );
  }

  const [assinatura, assistencia] = await Promise.all([
    chamarApi<DetalheDaAssinatura>("/api/assinatura/"),
    chamarApi<Assistencia>("/api/assistencia/"),
  ]);
  const aPagar = assinatura.contratada ? faturaAPagar(assinatura.faturas) : undefined;
  const atrasada = assinatura.situacao === "inadimplente" || assinatura.situacao === "suspensa";

  return (
    <>
      <CabecalhoDaPagina
        titulo="Assinatura"
        descricao="A mensalidade do Bancada, as faturas e o cancelamento."
        junto={<Selo status={assinatura.situacao} rotulo={assinatura.situacao_rotulo} />}
      />

      <div className="max-w-3xl space-y-6">
        <Cartao titulo="Situação" icone={SealCheckIcon}>
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-texto-suave">
              {explicacaoDaAssinatura(assinatura)}
            </p>

            {assinatura.contratada ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
                {aPagar && <BotaoDaFatura fatura={aPagar} atrasada={atrasada} />}
                <CancelamentoDaAssinatura />
              </div>
            ) : (
              <>
                <p className="text-[13px] text-texto-suave">
                  {emReais(assinatura.valor_mensal)} por mês. Você paga por PIX, boleto ou cartão,
                  na página de pagamento do Asaas, e pode cancelar quando quiser.
                </p>
                <FormularioDeAssinatura
                  documento={assinatura.documento_do_pagador || assistencia.documento}
                  valorMensal={assinatura.valor_mensal}
                />
              </>
            )}
          </div>
        </Cartao>

        <Cartao titulo="Faturas" icone={ReceiptIcon} semEspaco>
          {assinatura.faturas.length > 0 ? (
            <ul className="divide-y divide-borda">
              {assinatura.faturas.map((fatura) => (
                <LinhaDaFatura key={fatura.id} fatura={fatura} />
              ))}
            </ul>
          ) : (
            <EstadoVazio
              icone={ReceiptIcon}
              titulo="Nenhuma fatura ainda"
              descricao="A primeira aparece aqui assim que você assinar."
            />
          )}
        </Cartao>
      </div>
    </>
  );
}
