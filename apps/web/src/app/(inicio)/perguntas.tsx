import { PlusIcon, WhatsappLogoIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { CabecalhoDaSecao, conteiner } from "./secao";

function perguntasFrequentes(diasDeTeste: number) {
  return [
    {
      pergunta: "Como funciona o teste grátis?",
      resposta: `Você cria a conta em uma tela e já começa a usar, com tudo liberado por ${diasDeTeste} dias e sem cadastrar cartão. Para continuar depois, é só assinar na tela Assinatura informando o CPF ou o CNPJ. A primeira mensalidade vence no último dia do teste, então você não perde nenhum dia grátis.`,
    },
    {
      pergunta: "O que acontece se eu não assinar?",
      resposta:
        "O Bancada fica só para consulta: você entra e vê tudo, mas não abre nem altera ordens. Nenhum dado é apagado, e assinando você volta a usar normalmente.",
    },
    {
      pergunta: "Meu cliente precisa baixar aplicativo ou criar conta?",
      resposta:
        "Não. Ele recebe um link e acompanha o conserto pelo navegador do celular, sem instalar nada e sem senha.",
    },
    {
      pergunta: "Preciso instalar alguma coisa?",
      resposta:
        "Não. O Bancada funciona no navegador do computador, do tablet e do celular. No celular, o menu fica numa barra embaixo da tela, como num aplicativo.",
    },
    {
      pergunta: "Quantas pessoas podem usar?",
      resposta:
        "Quantas você precisar, sem pagar a mais por isso. Cada pessoa entra com o próprio e-mail e um papel: dono, técnico ou atendente.",
    },
    {
      pergunta: "Já uso papel, planilha ou outro sistema. Como começo?",
      resposta:
        "Comece pelas próximas ordens: cliente, aparelho e defeito entram numa tela só, ali no balcão. As ordens antigas podem terminar onde já estão.",
    },
    {
      pergunta: "Meus dados e os dos meus clientes ficam seguros?",
      resposta:
        "Cada assistência só enxerga os próprios dados, com uma trava no próprio banco de dados. A senha de desbloqueio fica criptografada e as fotos não têm endereço público: cada link vale por 15 minutos.",
    },
    {
      pergunta: "Como eu pago e como cancelo?",
      resposta:
        "Por PIX, boleto ou cartão, todo mês, na página de pagamento do Asaas. Para cancelar, é um botão na tela Assinatura, sem multa e sem fidelidade.",
    },
  ];
}

type Props = { diasDeTeste: number; whatsapp: string | null };

export function Perguntas({ diasDeTeste, whatsapp }: Props) {
  return (
    <section id="duvidas" className="scroll-mt-16 border-t border-borda bg-superficie">
      <div
        className={juntar(
          conteiner,
          "grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16",
        )}
      >
        <div>
          <CabecalhoDaSecao
            alinhamento="esquerda"
            sobretitulo="Dúvidas"
            titulo="Perguntas frequentes"
            descricao={
              whatsapp ? "Não achou o que procurava? Fale direto com quem faz o Bancada." : undefined
            }
          />
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className={juntar(botao("secundario"), "mt-8")}
            >
              <WhatsappLogoIcon size={18} />
              Chamar no WhatsApp
            </a>
          )}
        </div>

        <div className="divide-y divide-borda border-y border-borda">
          {perguntasFrequentes(diasDeTeste).map(({ pergunta, resposta }) => (
            <details key={pergunta} className="pergunta group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-5 text-left text-base font-semibold [&::-webkit-details-marker]:hidden">
                {pergunta}
                <PlusIcon
                  size={18}
                  className="shrink-0 text-icone transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                />
              </summary>
              <p className="pr-10 pb-5 text-[15px] leading-relaxed text-pretty text-texto-suave">
                {resposta}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
