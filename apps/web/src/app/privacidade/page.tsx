import { TextoLegal } from "@/componentes/TextoLegal";
import { VERSAO_DOS_TEXTOS_LEGAIS } from "@/lib/textosLegais";

export const metadata = { title: "Política de privacidade · Bancada" };

export default function Privacidade() {
  return (
    <TextoLegal titulo="Política de privacidade" versao={VERSAO_DOS_TEXTOS_LEGAIS}>
      <p className="rounded-xl bg-realce p-4 text-sm">
        Rascunho para revisão. Os trechos entre colchetes dependem de decisões ainda em aberto,
        como quem responde pelo Bancada e quais provedores serão usados, e são preenchidos antes
        do lançamento. O texto final passa por um advogado.
      </p>

      <h2>Quem somos</h2>
      <p>
        O Bancada é um sistema de ordens de serviço para assistências técnicas de celular,
        oferecido por [nome ou razão social], [CPF ou CNPJ], com endereço em [endereço]. Para
        qualquer assunto sobre dados pessoais, escreva para [e-mail de contato] ou fale pelo
        WhatsApp do suporte.
      </p>

      <h2>Os dois papéis do Bancada</h2>
      <p>
        A Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018) separa quem decide sobre os
        dados, o controlador, de quem os trata em nome dele, o operador. No Bancada é assim:
      </p>
      <ul>
        <li>
          <strong>Dados de quem usa o sistema</strong>, o dono da assistência e a equipe dele: o
          Bancada é o controlador.
        </li>
        <li>
          <strong>Dados dos clientes da assistência</strong>, as pessoas que deixam o aparelho
          para consertar: a assistência é a controladora, e o Bancada é o operador. Ele guarda e
          processa esses dados só para prestar o serviço à assistência, seguindo as instruções
          dela e esta política.
        </li>
      </ul>

      <h2>Que dados tratamos</h2>
      <p>De quem usa o sistema:</p>
      <ul>
        <li>nome, e-mail, WhatsApp e papel na equipe (dono, técnico ou atendente);</li>
        <li>
          senha de acesso, guardada embaralhada de um jeito que nem o Bancada consegue ler;
        </li>
        <li>CPF ou CNPJ do dono, informado para a cobrança da assinatura;</li>
        <li>
          dados da assistência e das lojas: nome, CNPJ, telefone, endereço e logo;
        </li>
        <li>
          registros de segurança: data, hora e endereço de internet (IP) das tentativas de login
          recusadas e das ações sensíveis, como consultar a senha de desbloqueio de um aparelho,
          e o horário do último uso do sistema.
        </li>
      </ul>
      <p>Dos clientes da assistência, que o Bancada trata como operador:</p>
      <ul>
        <li>nome, telefone e, se a assistência informar, e-mail e CPF;</li>
        <li>marca, modelo, cor e IMEI do aparelho;</li>
        <li>senha ou padrão de desbloqueio do aparelho, quando a assistência o registra;</li>
        <li>
          defeito relatado, diagnóstico, orçamento, fotos do aparelho, histórico do conserto e
          pagamentos registrados na entrega.
        </li>
      </ul>

      <h2>Para que usamos os dados</h2>
      <ul>
        <li>
          <strong>Prestar o serviço:</strong> criar e manter a conta, deixar a equipe usar o
          sistema e mandar ao cliente da assistência os avisos e o link de acompanhamento. Base
          legal: execução do contrato (art. 7º, V, da LGPD).
        </li>
        <li>
          <strong>Cobrar a assinatura:</strong> nome, e-mail e CPF ou CNPJ do dono vão ao Asaas,
          a instituição de pagamento que gera as cobranças. Base legal: execução do contrato e
          cumprimento de obrigações legais e fiscais (art. 7º, II e V).
        </li>
        <li>
          <strong>Proteger as contas:</strong> registrar logins recusados e quem consultou uma
          senha de desbloqueio, bloquear tentativas repetidas e investigar abusos. Base legal:
          legítimo interesse (art. 7º, IX). [Confirmar com o advogado a guarda dos registros de
          acesso por 6 meses, do Marco Civil da Internet.]
        </li>
        <li>
          <strong>Atender e melhorar o sistema:</strong> responder pelo suporte e acompanhar o
          uso em números somados, como quantas ordens foram abertas no mês. Base legal: legítimo
          interesse.
        </li>
      </ul>
      <p>
        Os dados dos clientes da assistência servem só para registrar e acompanhar o conserto. O
        Bancada não vende, não aluga e não usa esses dados para publicidade.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        O Bancada usa empresas que prestam serviço a ele, e cada uma recebe só o necessário para
        a sua parte:
      </p>
      <ul>
        <li>servidor onde o sistema roda: [provedor e país];</li>
        <li>envio dos e-mails: [provedor de e-mail];</li>
        <li>
          armazenamento das fotos e das cópias de segurança: [provedor e país]. As cópias vão
          criptografadas;
        </li>
        <li>cobrança da assinatura: Asaas;</li>
        <li>
          monitoramento de erros: [serviço]. Ele recebe só o tipo do erro e a tela onde aconteceu,
          sem dados pessoais.
        </li>
      </ul>
      <p>
        O WhatsApp não recebe dados do Bancada: os botões de WhatsApp só abrem o aplicativo no
        aparelho de quem clicou, com a mensagem pronta. Quando um desses serviços fica fora do
        Brasil, a transferência segue as regras da LGPD para transferência internacional (art.
        33). Dados também podem ser entregues a autoridades quando a lei ou uma ordem judicial
        obrigar.
      </p>

      <h2>O que o cliente da assistência vê pelo link</h2>
      <p>
        A página de acompanhamento mostra o andamento do conserto, o orçamento, a previsão de
        entrega e as fotos que a assistência deixou visíveis. Ela nunca mostra o IMEI completo, o
        CPF nem o endereço. O link é longo e impossível de adivinhar, e quem o recebe deve
        guardá-lo como um dado privado.
      </p>

      <h2>Como protegemos os dados</h2>
      <ul>
        <li>a conexão com o sistema é sempre criptografada (HTTPS);</li>
        <li>
          cada assistência só enxerga os próprios dados, com uma trava no próprio banco de dados,
          além da do sistema;
        </li>
        <li>
          a senha de desbloqueio dos aparelhos fica criptografada, só o dono e os técnicos
          conseguem vê-la, cada consulta fica registrada, e ela se apaga sozinha 7 dias depois da
          entrega, quando o aparelho não tem outra ordem aberta;
        </li>
        <li>
          as fotos ficam guardadas em local privado e só abrem por links que vencem em 15
          minutos. Ao receber uma foto, o sistema descarta os dados escondidos no arquivo, como o
          lugar onde ela foi tirada;
        </li>
        <li>dez senhas erradas seguidas bloqueiam o login daquele e-mail por uma hora;</li>
        <li>
          todo dia é feita uma cópia de segurança, criptografada e guardada fora do servidor.
        </li>
      </ul>

      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>
          dados da conta e da assistência: enquanto a conta existir. Depois do cancelamento, a
          assistência continua podendo entrar e consultar tudo, e os dados são apagados quando
          ela pedir, menos o que a lei manda guardar, como os registros de cobrança. [Definir o
          prazo para apagar contas canceladas sem pedido.]
        </li>
        <li>
          dados dos clientes da assistência: enquanto a assistência mantiver a conta, ou até ela
          pedir a exclusão. A senha de desbloqueio se apaga 7 dias depois da entrega;
        </li>
        <li>cópias de segurança: 30 dias.</li>
      </ul>

      <h2>Seus direitos</h2>
      <p>
        A LGPD garante, entre outros, o direito de saber se seus dados são tratados, ter acesso a
        eles, corrigi-los, pedir a exclusão do que for desnecessário, levá-los a outro serviço e
        saber com quem foram compartilhados.
      </p>
      <ul>
        <li>
          se você usa o sistema, como dono ou da equipe, fale com o Bancada em [e-mail de
          contato]. A resposta vem em até 15 dias;
        </li>
        <li>
          se você é cliente de uma assistência, faça o pedido à assistência, que é a controladora
          dos seus dados. O Bancada ajuda a assistência a responder, e um pedido que chegar a nós
          é encaminhado a ela.
        </li>
      </ul>
      <p>
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>Cookies</h2>
      <p>O Bancada usa só dois cookies, os dois necessários para o sistema funcionar:</p>
      <ul>
        <li>
          <strong>bancada_token</strong>, que mantém você conectado por até 30 dias e não pode
          ser lido pelos scripts da página;
        </li>
        <li>
          <strong>tema</strong>, que guarda por até um ano se você escolheu o modo escuro.
        </li>
      </ul>
      <p>
        Não usamos cookies de publicidade nem de rastreamento. [Se a medição de visitas escolhida
        para o lançamento usar cookies, esta seção muda, e o site passa a mostrar um aviso.]
      </p>

      <h2>Incidentes de segurança</h2>
      <p>
        Se um incidente de segurança puder causar risco ou dano relevante, as assistências
        afetadas e a ANPD são avisadas, como a LGPD exige.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>
        Quando esta política mudar, a versão no topo muda junto, e as assistências são avisadas
        por e-mail e no sistema antes de a mudança valer.
      </p>
    </TextoLegal>
  );
}
