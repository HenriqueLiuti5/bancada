import Link from "next/link";
import { TextoLegal } from "@/componentes/TextoLegal";
import { VERSAO_DOS_TEXTOS_LEGAIS } from "@/lib/textosLegais";

export const metadata = { title: "Termos de uso · Bancada" };

export default function Termos() {
  return (
    <TextoLegal titulo="Termos de uso" versao={VERSAO_DOS_TEXTOS_LEGAIS}>
      <p className="rounded-xl bg-realce p-4 text-sm">
        Rascunho para revisão. Os trechos entre colchetes dependem de decisões ainda em aberto,
        como quem responde pelo Bancada, e são preenchidos antes do lançamento. O texto final
        passa por um advogado.
      </p>

      <h2>Quem oferece o Bancada</h2>
      <p>
        O Bancada é oferecido por [nome ou razão social], [CPF ou CNPJ], com endereço em
        [endereço]. O contato é pelo e-mail [e-mail de contato] e pelo WhatsApp do suporte.
      </p>

      <h2>O serviço</h2>
      <p>
        O Bancada é um sistema na internet para assistências técnicas registrarem ordens de
        serviço, acompanharem cada conserto e mostrarem o andamento ao cliente por um link. Ele é
        usado pelo navegador, sem instalar nada.
      </p>

      <h2>Quem pode contratar</h2>
      <p>
        Assistências técnicas, representadas por uma pessoa maior de 18 anos que possa aceitar
        estes termos em nome delas. Ao criar a conta, você declara que os dados do cadastro são
        verdadeiros.
      </p>

      <h2>Conta e equipe</h2>
      <ul>
        <li>
          o dono cria a conta da assistência, convida a equipe e responde pelo que a equipe faz no
          sistema, inclusive por desativar quem deixar a assistência;
        </li>
        <li>cada pessoa entra com o próprio e-mail e senha, que não devem ser compartilhados;</li>
        <li>
          se suspeitar que alguém entrou na sua conta, troque a senha e avise o suporte.
        </li>
      </ul>

      <h2>Teste grátis</h2>
      <p>
        Toda assistência nova tem 30 dias grátis, sem informar forma de pagamento. Se o teste
        acabar sem assinatura, o sistema fica só para consulta: dá para entrar e ver tudo, mas não
        abrir nem alterar ordens.
      </p>

      <h2>Assinatura e pagamento</h2>
      <ul>
        <li>
          o valor mensal é o que aparece na página inicial e na tela Assinatura no momento da
          contratação;
        </li>
        <li>
          a cobrança é gerada pelo Asaas, uma instituição de pagamento, e pode ser paga por PIX,
          boleto ou cartão;
        </li>
        <li>quem assina durante o teste paga a primeira mensalidade no último dia do teste;</li>
        <li>
          uma mudança de preço é avisada com pelo menos 30 dias de antecedência e só vale a partir
          da cobrança seguinte ao aviso.
        </li>
      </ul>

      <h2>Atraso</h2>
      <p>
        Com uma mensalidade atrasada há mais de 7 dias, o sistema fica só para consulta até o
        pagamento. Nenhum dado é apagado por falta de pagamento.
      </p>

      <h2>Cancelamento</h2>
      <p>
        O dono cancela quando quiser, na tela Assinatura, sem multa. O acesso completo continua
        até o fim do mês já pago, e depois o sistema fica só para consulta. [Confirmar: não há
        devolução proporcional do mês em andamento.]
      </p>

      <h2>Os dados são da assistência</h2>
      <p>
        A assistência é dona dos dados que cadastra e é a controladora dos dados dos clientes
        dela. Cabe a ela ter um motivo legítimo para registrá-los, informar os clientes, inclusive
        de que usa o Bancada, e atender aos pedidos deles. O Bancada trata esses dados como
        operador, do jeito descrito na{" "}
        <Link href="/privacidade" className="font-semibold text-destaque underline">
          política de privacidade
        </Link>
        , e não os usa para mais nada.
      </p>
      <p>
        A senha de desbloqueio de um aparelho só deve ser registrada quando o cliente a passar
        para o conserto. O sistema a guarda criptografada e a apaga 7 dias depois da entrega.
      </p>

      <h2>O que não é permitido</h2>
      <ul>
        <li>usar o sistema para qualquer coisa ilegal;</li>
        <li>cadastrar dados de pessoas que não têm relação com um atendimento da assistência;</li>
        <li>tentar ver dados de outras assistências ou contornar a segurança do sistema;</li>
        <li>sobrecarregar o sistema de propósito;</li>
        <li>revender ou emprestar o acesso a quem não é da assistência.</li>
      </ul>
      <p>Fazer isso pode levar à suspensão da conta.</p>

      <h2>Funcionamento e suporte</h2>
      <p>
        O Bancada trabalha para manter o sistema no ar o tempo todo, mas podem acontecer
        interrupções para manutenção ou por falhas de terceiros, como a internet e o servidor.
        Todo dia é feita uma cópia de segurança dos dados. O suporte é pelo WhatsApp, [dias e
        horários de atendimento].
      </p>

      <h2>Responsabilidade</h2>
      <p>
        O Bancada responde pelo funcionamento do sistema conforme estes termos. Ele não responde
        pelas decisões da assistência, pelo que ela cadastra, por falhas na internet ou nos
        aparelhos dela, nem por prejuízos indiretos, como lucro que deixou de entrar. [Confirmar
        com o advogado o limite da responsabilidade, como o valor pago nos 12 meses anteriores.]
      </p>

      <h2>Fim do contrato</h2>
      <p>
        Ao encerrar o uso, a assistência pode pedir pelo suporte uma cópia dos seus dados e a
        exclusão definitiva deles, que é feita em até [prazo], menos o que a lei manda guardar.
      </p>

      <h2>Mudanças nestes termos</h2>
      <p>
        Quando estes termos mudarem, a versão no topo muda junto, e as assistências são avisadas
        por e-mail e no sistema antes de a mudança valer.
      </p>

      <h2>Lei e foro</h2>
      <p>
        Estes termos seguem as leis do Brasil. Fica escolhido o foro da comarca de [cidade e
        estado], salvo quando a lei garantir outro.
      </p>
    </TextoLegal>
  );
}
