import Link from "next/link";
import { Contato, TextoLegal } from "@/componentes/TextoLegal";
import {
  HORARIO_DO_SUPORTE,
  RESPONSAVEL_PELO_BANCADA,
  VERSAO_DOS_TEXTOS_LEGAIS,
} from "@/lib/textosLegais";

export const metadata = { title: "Termos de uso · Bancada" };

export default function Termos() {
  return (
    <TextoLegal titulo="Termos de uso" versao={VERSAO_DOS_TEXTOS_LEGAIS}>
      <p>
        Estes termos valem entre o Bancada e cada assistência técnica que usa o sistema. Ao marcar,
        no cadastro, que leu e aceita estes termos, quem cria a conta concorda com eles em nome da
        assistência.
      </p>

      <h2>Quem oferece o Bancada</h2>
      <p>
        O Bancada é oferecido por {RESPONSAVEL_PELO_BANCADA}. O contato é <Contato />,{" "}
        {HORARIO_DO_SUPORTE}.
      </p>

      <h2>O serviço</h2>
      <p>
        O Bancada é um sistema na internet para assistências técnicas de celular. Com ele, a
        assistência abre e acompanha as ordens de serviço, mostra o andamento do conserto ao cliente
        por um link, controla o estoque de peças, registra as vendas no balcão, as contas a pagar e o
        caixa, e vê os números da loja num painel. Ele funciona no navegador do computador e do
        celular, sem instalar nada.
      </p>

      <h2>Quem pode usar</h2>
      <p>
        Assistências técnicas, representadas por uma pessoa maior de 18 anos que possa aceitar estes
        termos em nome delas. Os dados informados no cadastro precisam ser verdadeiros.
      </p>

      <h2>Conta e equipe</h2>
      <ul>
        <li>
          o dono cria a conta da assistência, convida a equipe e escolhe o papel de cada pessoa:
          dono, técnico ou atendente;
        </li>
        <li>o dono responde pelo que a equipe faz no sistema e desativa quem deixar a assistência;</li>
        <li>
          cada pessoa entra com o próprio e-mail e a própria senha, que não devem ser compartilhados;
        </li>
        <li>quem suspeitar que alguém entrou na sua conta deve trocar a senha e avisar o suporte.</li>
      </ul>

      <h2>Teste grátis</h2>
      <p>
        Toda assistência nova tem 30 dias grátis, sem informar forma de pagamento. Se o teste acabar
        sem assinatura, o sistema fica só para consulta: dá para entrar, ver tudo e assinar, mas não
        registrar nem alterar nada.
      </p>

      <h2>Assinatura e pagamento</h2>
      <ul>
        <li>o valor mensal é o que aparece na tela Assinatura no momento da contratação;</li>
        <li>a cobrança é feita pelo Asaas, uma instituição de pagamento, por PIX, boleto ou cartão;</li>
        <li>quem assina durante o teste paga a primeira mensalidade no último dia do teste;</li>
        <li>
          uma mudança de preço é avisada ao dono por e-mail com pelo menos 30 dias de antecedência
          e só vale a partir da cobrança seguinte ao aviso.
        </li>
      </ul>

      <h2>Atraso</h2>
      <p>
        Com uma mensalidade atrasada há mais de 7 dias, o sistema fica só para consulta até o
        pagamento ser confirmado.
      </p>

      <h2>Cancelamento</h2>
      <p>
        O dono cancela quando quiser, na tela Assinatura, sem multa. O acesso completo continua até o
        fim do período já pago, e depois o sistema fica só para consulta. Não há devolução do valor
        proporcional do mês em andamento.
      </p>

      <h2>Os dados são da assistência</h2>
      <p>
        A assistência é dona de tudo o que registra no Bancada. Dos dados pessoais dos clientes dela,
        ela é a controladora, como define a Lei Geral de Proteção de Dados (LGPD): cabe a ela ter um
        motivo legítimo para registrá-los, informar os clientes, inclusive de que usa o Bancada, e
        atender aos pedidos deles. O Bancada trata esses dados como operador, só para prestar o
        serviço, do jeito descrito na <Link href="/privacidade">política de privacidade</Link>.
      </p>
      <p>
        A senha de desbloqueio de um aparelho só deve ser registrada quando o cliente a passar para o
        conserto. O sistema a guarda criptografada e a apaga sozinho 7 dias depois que o aparelho é
        entregue ou devolvido.
      </p>

      <h2>O que não é permitido</h2>
      <ul>
        <li>usar o sistema para qualquer coisa ilegal;</li>
        <li>
          registrar dados de pessoas que não têm relação com os atendimentos ou com o negócio da
          assistência;
        </li>
        <li>tentar ver dados de outras assistências ou contornar a segurança do sistema;</li>
        <li>sobrecarregar o sistema de propósito;</li>
        <li>revender ou emprestar o acesso a quem não é da assistência.</li>
      </ul>
      <p>Quem fizer isso pode ter a conta suspensa.</p>

      <h2>Funcionamento e suporte</h2>
      <p>
        O Bancada trabalha para manter o sistema no ar o tempo todo, mas pode haver interrupções para
        manutenção ou por falhas de terceiros, como a internet e o servidor. Todo dia é feita uma
        cópia de segurança dos dados. O atendimento é <Contato />, {HORARIO_DO_SUPORTE}.
      </p>

      <h2>Responsabilidade</h2>
      <p>
        O Bancada responde pelo funcionamento do sistema como descrito nestes termos. Ele não responde
        pelas decisões da assistência, pelo que ela registra, por falhas na internet ou nos aparelhos
        dela, nem por prejuízos indiretos, como o lucro que deixou de entrar.
      </p>
      <p>
        Quando o Bancada tiver de indenizar uma assistência, o valor fica limitado ao que ela pagou
        pela assinatura nos 12 meses anteriores ao problema, menos nos casos em que a lei não permite
        esse limite.
      </p>

      <h2>Fim do contrato</h2>
      <ul>
        <li>
          a qualquer momento, o dono pode pedir pelo suporte uma cópia dos dados da assistência e a
          exclusão da conta, que é feita em até 15 dias;
        </li>
        <li>
          quando o sistema fica só para consulta, porque o teste acabou sem assinatura, porque a
          assinatura foi cancelada ou por atraso, a assistência continua podendo entrar e ver tudo.
          Depois de 6 meses seguidos assim, a conta é apagada com todos os dados. O dono recebe um
          aviso por e-mail 30 dias antes, e assinar nesse meio-tempo mantém tudo;
        </li>
        <li>
          os dados apagados ainda ficam nas cópias de segurança por até 30 dias, até elas serem
          substituídas;
        </li>
        <li>ficam guardados só os registros que a lei manda manter, como os das cobranças.</li>
      </ul>

      <h2>Mudanças nestes termos</h2>
      <p>
        Quando estes termos mudarem, a versão no topo muda junto. Uma mudança que afete os direitos
        ou os deveres da assistência é avisada ao dono por e-mail pelo menos 30 dias antes de valer,
        e continuar usando o sistema depois dessa data vale como aceite. Correções que não mudam nada
        disso, como um endereço de e-mail novo, valem a partir da publicação.
      </p>

      <h2>Lei aplicável</h2>
      <p>Estes termos seguem as leis do Brasil.</p>
    </TextoLegal>
  );
}
