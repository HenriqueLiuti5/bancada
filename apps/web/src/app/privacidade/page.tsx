import { Contato, TextoLegal } from "@/componentes/TextoLegal";
import {
  HORARIO_DO_SUPORTE,
  RESPONSAVEL_PELO_BANCADA,
  VERSAO_DOS_TEXTOS_LEGAIS,
} from "@/lib/textosLegais";

export const metadata = { title: "Política de privacidade · Bancada" };

export default function Privacidade() {
  return (
    <TextoLegal titulo="Política de privacidade" versao={VERSAO_DOS_TEXTOS_LEGAIS}>
      <p>
        Esta política explica que dados pessoais o Bancada trata, para quê, com quem eles são
        compartilhados, por quanto tempo ficam guardados e como pedir o que a Lei Geral de Proteção
        de Dados (LGPD, Lei nº 13.709/2018) garante a você.
      </p>

      <h2>Quem responde pelos dados</h2>
      <p>
        O Bancada é um sistema de ordens de serviço para assistências técnicas de celular, oferecido
        por {RESPONSAVEL_PELO_BANCADA}, que responde pelo tratamento dos dados pessoais descrito
        aqui. Para qualquer assunto sobre dados pessoais, o contato é <Contato />,{" "}
        {HORARIO_DO_SUPORTE}.
      </p>

      <h2>Os dois papéis do Bancada</h2>
      <p>
        A LGPD separa quem decide sobre os dados, o controlador, de quem os trata em nome dele, o
        operador. No Bancada é assim:
      </p>
      <ul>
        <li>
          <strong>Dados de quem usa o sistema</strong>, o dono da assistência e a equipe: o Bancada é
          o controlador.
        </li>
        <li>
          <strong>Dados dos clientes da assistência</strong>, as pessoas que deixam o aparelho para
          consertar, e tudo o mais que a assistência registra: a assistência é a controladora, e o
          Bancada é o operador. Ele guarda e processa esses dados só para prestar o serviço a ela,
          seguindo esta política.
        </li>
      </ul>

      <h2>Que dados tratamos</h2>
      <p>De quem usa o sistema:</p>
      <ul>
        <li>nome, e-mail e papel na equipe: dono, técnico ou atendente;</li>
        <li>senha de acesso, guardada de um jeito que nem o Bancada consegue ler;</li>
        <li>
          dados da assistência e das lojas: nome, CNPJ, WhatsApp, telefone, endereço, fuso horário e
          logo;
        </li>
        <li>CPF ou CNPJ de quem paga a assinatura, e as faturas;</li>
        <li>
          registros de acesso: data, hora e endereço de internet (IP) de cada entrada no sistema e de
          cada tentativa com a senha errada;
        </li>
        <li>
          registros de segurança: quem fez cada ação sensível, quando e de qual IP, como consultar a
          senha de desbloqueio de um aparelho, remover um pagamento ou trocar o cliente de uma ordem;
        </li>
        <li>quando a pessoa usou o sistema pela última vez e quais tutoriais já viu.</li>
      </ul>
      <p>Dos clientes da assistência, que o Bancada trata como operador:</p>
      <ul>
        <li>nome, telefone e, se a assistência informar, e-mail e CPF;</li>
        <li>
          marca, modelo, cor e IMEI do aparelho, e a senha ou o padrão de desbloqueio, quando a
          assistência o registra;
        </li>
        <li>
          defeito relatado, diagnóstico, orçamento, fotos do aparelho, histórico do conserto,
          comentários da equipe e pagamentos.
        </li>
      </ul>
      <p>
        O estoque, as vendas no balcão, as contas a pagar e o caixa também são registros da
        assistência, tratados do mesmo jeito. As vendas no balcão não guardam dados de quem comprou.
      </p>

      <h2>Para que usamos os dados</h2>
      <ul>
        <li>
          <strong>Prestar o serviço:</strong> criar e manter a conta, deixar a equipe usar o sistema,
          mandar os e-mails de confirmação, de convite e de recuperação de senha, e mandar ao cliente
          da assistência os avisos do conserto por e-mail e o link de acompanhamento. Base legal:
          execução do contrato (art. 7º, V, da LGPD).
        </li>
        <li>
          <strong>Cobrar a assinatura:</strong> o nome da assistência, o e-mail e o CPF ou CNPJ de
          quem paga vão ao Asaas, a instituição de pagamento que gera as cobranças. Os dados do cartão
          são digitados na página do Asaas e não passam pelo Bancada. Base legal: execução do
          contrato e cumprimento de obrigações legais e fiscais (art. 7º, II e V).
        </li>
        <li>
          <strong>Cumprir a lei e proteger as contas:</strong> guardar os registros de acesso por 6
          meses, como manda o Marco Civil da Internet (Lei nº 12.965/2014, art. 15), registrar as
          ações sensíveis, bloquear tentativas repetidas de senha e investigar abusos. Base legal:
          cumprimento de obrigação legal e legítimo interesse (art. 7º, II e IX).
        </li>
        <li>
          <strong>Contar as visitas ao site:</strong> saber quantas pessoas abrem as páginas do
          Bancada, de onde vieram e quantas criaram a conta, como explicado em Medição de visitas.
          Base legal: legítimo interesse (art. 7º, IX).
        </li>
        <li>
          <strong>Atender e acompanhar as assistências:</strong> responder pelo suporte e acompanhar,
          num painel só do Bancada, o nome, o dono, o e-mail e o WhatsApp de cada assistência, a
          situação da assinatura, quantas ordens ela abriu e quando usou o sistema pela última vez.
          Esse painel não mostra os dados dos clientes das assistências. Base legal: legítimo
          interesse (art. 7º, IX).
        </li>
      </ul>
      <p>
        O Bancada não vende nem aluga dados pessoais e não os usa para publicidade. Os dados dos
        clientes da assistência servem só para registrar e acompanhar o atendimento.
      </p>

      <h2>Quem vê os dados</h2>
      <ul>
        <li>
          dentro da assistência, cada pessoa vê o que o papel dela permite. A senha de desbloqueio,
          por exemplo, só aparece para o dono e os técnicos;
        </li>
        <li>
          uma assistência nunca vê os dados de outra: além do sistema, o próprio banco de dados
          separa uma da outra;
        </li>
        <li>
          o responsável pelo Bancada só abre os dados de uma assistência para dar o suporte que ela
          pediu, para manter o sistema funcionando ou quando a lei obrigar.
        </li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <p>
        O Bancada usa empresas que prestam serviço a ele, e cada uma recebe só o necessário para a sua
        parte:
      </p>
      <ul>
        <li>o Asaas, na cobrança da assinatura;</li>
        <li>o provedor do servidor, onde ficam o sistema e o banco de dados;</li>
        <li>o provedor que envia os e-mails;</li>
        <li>
          o provedor que guarda as fotos e as cópias de segurança, que saem do servidor
          criptografadas;
        </li>
        <li>
          o serviço de monitoramento de erros, que recebe o tipo do erro e a tela onde ele aconteceu,
          sem dados pessoais.
        </li>
      </ul>
      <p>
        O WhatsApp não recebe dados do Bancada: os botões de WhatsApp só abrem o aplicativo no
        aparelho de quem clicou, com a mensagem pronta. Quando um desses serviços fica fora do Brasil,
        a transferência segue as regras da LGPD para transferência internacional (art. 33). Dados
        também podem ser entregues a autoridades quando a lei ou uma ordem judicial obrigar.
      </p>

      <h2>Medição de visitas</h2>
      <p>
        Para contar as visitas, o Bancada usa o Umami, um programa de estatísticas instalado no
        próprio servidor do Bancada, que não manda nada a outras empresas. Ele não usa cookies e não
        guarda o IP: com o IP e o navegador, calcula um código que muda todo mês, só para separar um
        visitante do outro, e estima o país, o estado e a cidade.
      </p>
      <ul>
        <li>
          ele registra a página aberta, o site ou o link de onde a pessoa veio, o navegador, o
          sistema, o tipo de aparelho, o tamanho da tela e o idioma;
        </li>
        <li>quando alguém cria a conta, ele conta o cadastro, sem guardar quem se cadastrou;</li>
        <li>
          ele só conta a página inicial, a demonstração, o cadastro, a entrada no sistema, os termos
          de uso e esta política. O que acontece dentro do sistema e na página de acompanhamento dos
          clientes nunca chega a ele;
        </li>
        <li>se o navegador pedir para não ser rastreado, nada é contado;</li>
        <li>os números ficam guardados para comparar um mês com o outro.</li>
      </ul>

      <h2>O que o cliente da assistência vê pelo link</h2>
      <p>
        A página de acompanhamento mostra o primeiro nome do cliente, o aparelho, o andamento do
        conserto, a previsão de entrega, o orçamento e as fotos que a assistência deixou visíveis,
        além do nome, do telefone e da logo da loja. Ela não mostra o telefone, o e-mail, o CPF nem o
        IMEI do cliente, nem a senha do aparelho. O endereço do link é longo e impossível de
        adivinhar, quem o recebe deve guardá-lo como um dado privado, e ele para de abrir 90 dias
        depois da entrega.
      </p>

      <h2>Como protegemos os dados</h2>
      <ul>
        <li>a conexão com o sistema é sempre criptografada (HTTPS);</li>
        <li>
          a senha de desbloqueio dos aparelhos fica criptografada, cada consulta a ela fica
          registrada, e ela se apaga sozinha 7 dias depois que o aparelho é entregue ou devolvido,
          quando ele não tem outra ordem aberta;
        </li>
        <li>
          as fotos ficam guardadas em local privado e só abrem por links que vencem em 15 minutos. Ao
          receber uma foto, o sistema descarta as informações escondidas no arquivo, como o lugar onde
          ela foi tirada;
        </li>
        <li>dez senhas erradas seguidas bloqueiam a entrada com aquele e-mail por uma hora;</li>
        <li>todo dia é feita uma cópia de segurança, criptografada e guardada fora do servidor.</li>
      </ul>

      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>
          dados da conta, da assistência e dos clientes dela: enquanto a conta existir. Ela é
          apagada em até 15 dias quando o dono pede, ou sozinha quando passa 6 meses seguidos só
          para consulta, com um aviso por e-mail 30 dias antes;
        </li>
        <li>senha de desbloqueio: 7 dias depois que o aparelho é entregue ou devolvido;</li>
        <li>registros de acesso: 6 meses;</li>
        <li>registros de segurança: enquanto a conta existir;</li>
        <li>
          registros das cobranças da assinatura: pelo prazo que a lei fiscal manda, mesmo depois que a
          conta é apagada;
        </li>
        <li>cópias de segurança: 30 dias.</li>
      </ul>

      <h2>Seus direitos</h2>
      <p>
        A LGPD garante, entre outros, o direito de saber se seus dados são tratados, ter acesso a
        eles, corrigi-los, pedir a exclusão do que for desnecessário, levá-los a outro serviço e saber
        com quem foram compartilhados.
      </p>
      <ul>
        <li>
          se você usa o sistema, como dono ou da equipe, faça o pedido <Contato ou />. A resposta
          vem em até 15 dias;
        </li>
        <li>
          se você é cliente de uma assistência, faça o pedido à assistência, que é a controladora dos
          seus dados. O Bancada ajuda a assistência a responder, e um pedido que chegar a ele é
          encaminhado a ela.
        </li>
      </ul>
      <p>Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

      <h2>Cookies</h2>
      <p>
        O Bancada usa três cookies, todos para o sistema funcionar ou para lembrar uma escolha sua:
      </p>
      <ul>
        <li>
          <strong>bancada_token</strong>, que mantém você conectado por até 30 dias e não pode ser
          lido pelos scripts da página;
        </li>
        <li>
          <strong>tema</strong>, que lembra por até um ano se você escolheu o modo escuro ou o
          automático, que segue o aparelho;
        </li>
        <li>
          <strong>lateral</strong>, que lembra por até um ano se você recolheu o menu do lado da tela.
        </li>
      </ul>
      <p>
        O Bancada não usa cookies de publicidade nem de rastreamento, e a medição de visitas funciona
        sem cookies.
      </p>

      <h2>Incidentes de segurança</h2>
      <p>
        Se um incidente de segurança puder causar risco ou dano relevante, o Bancada avisa as
        assistências afetadas e a ANPD, como a LGPD exige.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>
        Quando esta política mudar, a versão no topo muda junto, e uma mudança importante é avisada
        ao dono de cada assistência por e-mail antes de valer.
      </p>
    </TextoLegal>
  );
}
