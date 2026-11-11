import { PlusIcon, WhatsappLogoIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { CabecalhoDaSecao, conteiner } from "./secao";

function perguntasFrequentes(diasDeTeste: number) {
  return [
    {
      pergunta: "Como funciona o teste grátis?",
      resposta: `Você cria a conta em uma tela e já começa a usar, com tudo liberado por ${diasDeTeste} dias e sem cadastrar cartão. Para continuar depois, é só assinar na tela Assinatura informando o CPF ou o CNPJ. A primeira cobrança vence no último dia do teste, então você não perde nenhum dia grátis.`,
    },
    {
      pergunta: "Quanto custa e qual plano escolher?",
      resposta: [
        "Todos os planos têm todos os recursos; muda só o tamanho da assistência. O Solo serve para 1 loja com até 2 pessoas, o Equipe para 1 loja com quantas pessoas você precisar, e o Rede para até 3 lojas, também com pessoas ilimitadas.",
        "Dá para pagar por mês ou por ano. O anual custa 10 mensalidades, ou seja, você ganha 2 meses grátis.",
      ],
    },
    {
      pergunta: "O que é o preço de fundador?",
      resposta:
        "As 15 primeiras assinaturas pagam 30% menos, no mensal e no anual. O desconto vale enquanto a assinatura continuar; quem cancela perde o preço de fundador, e a vaga não volta. Quando as 15 vagas acabam, a página passa a mostrar só o preço cheio.",
    },
    {
      pergunta: "O que acontece se eu não assinar?",
      resposta:
        "O Reparium fica só para consulta: você entra e vê tudo, mas não abre nem altera ordens, e assinando você volta a usar normalmente. Se a conta passar 6 meses assim, ela é apagada, com um aviso por e-mail 30 dias antes.",
    },
    {
      pergunta: "Meu cliente precisa baixar aplicativo ou criar conta?",
      resposta:
        "Não. Ele recebe um link e acompanha o conserto pelo navegador do celular, sem instalar nada e sem senha.",
    },
    {
      pergunta: "Preciso instalar alguma coisa?",
      resposta:
        "Não. O Reparium funciona no navegador do computador, do tablet e do celular. No celular, o menu fica numa barra embaixo da tela, como num aplicativo.",
    },
    {
      pergunta: "Quantas pessoas podem usar?",
      resposta:
        "O plano Solo aceita até 2 pessoas; o Equipe e o Rede, quantas você precisar. Cada pessoa entra com o próprio e-mail e um papel: dono, técnico ou atendente.",
    },
    {
      pergunta: "Meus dados e os dos meus clientes ficam seguros?",
      resposta: [
        "Sim. Cada assistência só vê as próprias ordens e os próprios clientes. As outras lojas que usam o Reparium não têm como ver os seus dados.",
        "A senha de desbloqueio do aparelho fica guardada embaralhada. Só o dono e os técnicos conseguem ver, o sistema anota quem viu e quando, e ela se apaga sozinha 7 dias depois da entrega.",
        "As fotos do aparelho não ficam soltas na internet. O link de cada foto só funciona por 15 minutos: se alguém repassar o link, depois disso ele não abre mais.",
      ],
    },
    {
      pergunta: "Como eu pago e como cancelo?",
      resposta: [
        "No plano mensal chega uma fatura no seu e-mail todo mês, e no anual uma vez por ano, sempre com PIX, boleto ou cartão de crédito.",
        "Quem manda a fatura é o Asaas, a empresa que cuida da cobrança do Reparium, do mesmo jeito que a maquininha cuida dos pagamentos no seu balcão.",
        "Para cancelar, é só apertar um botão na tela Assinatura. Não tem multa nem fidelidade, e você continua usando até o fim do período que já pagou.",
      ],
    },
  ];
}

function paragrafos(resposta: string | string[]): string[] {
  return Array.isArray(resposta) ? resposta : [resposta];
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
              whatsapp ? "Não achou o que procurava? Fale direto com quem faz o Reparium." : undefined
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
              <div className="space-y-3 pr-10 pb-5 text-[15px] leading-relaxed text-pretty text-texto-suave">
                {paragrafos(resposta).map((paragrafo) => (
                  <p key={paragrafo}>{paragrafo}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
