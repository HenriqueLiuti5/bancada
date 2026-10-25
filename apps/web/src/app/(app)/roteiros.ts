export type NomeDoTour =
  | "ordens"
  | "nova-ordem"
  | "ordem"
  | "painel"
  | "equipe"
  | "estoque"
  | "financeiro"
  | "a-receber";

export type Lado = "baixo" | "cima" | "direita" | "esquerda";

export type Parada = {
  alvo?: string;
  titulo: string;
  texto: string;
  papeis?: string[];
  lado?: Lado;
};

const DONO_E_TECNICO = ["dono", "tecnico"];

export const ROTEIROS: Record<NomeDoTour, Parada[]> = {
  ordens: [
    {
      titulo: "Boas-vindas ao Bancada",
      texto:
        "Esta é a lista de ordens de serviço, a tela principal do sistema. Em poucos passos mostramos o que cada parte faz. Para pular, feche no × ou aperte Esc.",
    },
    {
      alvo: "primeiros-passos",
      papeis: ["dono"],
      titulo: "Primeiros passos",
      texto:
        "Uma lista curta para deixar a assistência pronta para o dia a dia. Cada item se marca sozinho quando você o conclui.",
    },
    {
      alvo: "nova-ordem",
      titulo: "Nova ordem",
      texto:
        "Quando um aparelho chegar ao balcão, comece por aqui. Cliente, aparelho e defeito são cadastrados na mesma tela.",
    },
    {
      alvo: "situacoes",
      titulo: "Abertas, atrasadas, encerradas",
      texto:
        "Troque a visão da lista com um clique. Atrasadas são as ordens que passaram do prazo prometido ao cliente; Para hoje, as que vencem hoje.",
    },
    {
      alvo: "busca",
      titulo: "Busca e filtros",
      texto:
        "Encontre uma ordem pelo nome ou telefone do cliente, pelo aparelho, pelo IMEI ou pelo número da OS. Os filtros ao lado separam por status e por técnico.",
    },
    {
      alvo: "lista",
      titulo: "As ordens",
      texto:
        "Clique numa ordem para ver os detalhes, mudar o status e mandar o link de acompanhamento ao cliente.",
    },
    {
      alvo: "ajuda",
      lado: "direita",
      titulo: "Ajuda",
      texto:
        "Para ver este tour de novo ou entrar em contato com o suporte pelo WhatsApp, use este botão. Quando estiver pronto, abra uma ordem em Nova ordem.",
    },
  ],
  "nova-ordem": [
    {
      alvo: "cliente",
      titulo: "Cliente",
      texto:
        "Digite o nome ou o telefone. Se o cliente já veio antes, ele aparece na lista; se não, cadastre ali mesmo, sem sair da tela.",
    },
    {
      alvo: "aparelho",
      titulo: "Aparelho",
      texto:
        "Escolha um aparelho que o cliente já trouxe ou cadastre um novo. A senha de desbloqueio fica guardada com criptografia e é apagada depois da entrega.",
    },
    {
      alvo: "defeito",
      titulo: "Defeito e prazo",
      texto:
        "Escreva o problema como o cliente contou e, se já combinou, a data de entrega. Os dois saem no comprovante que ele assina no balcão.",
    },
    {
      alvo: "abrir",
      titulo: "Abrir a ordem",
      texto:
        "A ordem ganha um número e um link de acompanhamento. Se o cliente tiver e-mail, o link chega para ele na hora. Depois de abrir, imprima o comprovante e fotografe o aparelho.",
    },
  ],
  ordem: [
    {
      alvo: "acoes",
      titulo: "O que fazer agora",
      texto:
        "A barra mostra em que etapa a ordem está, e os botões levam à seguinte. O cliente é avisado nas etapas que interessam a ele, como orçamento pronto e aparelho pronto para retirada. Na entrega, você registra quanto cobrou e como ele pagou.",
    },
    {
      alvo: "abas",
      titulo: "Tudo da ordem em abas",
      texto:
        "No histórico fica o que aconteceu, com quem fez e quando, e a equipe deixa comentários que o cliente não vê. No orçamento, as peças, os serviços e o pagamento. Nas fotos, o estado em que o aparelho chegou. Nas anotações, o diagnóstico e o laudo.",
    },
    {
      alvo: "ficha",
      titulo: "Dados da ordem",
      texto:
        "Cliente, aparelho e defeito à mão, com o WhatsApp do cliente. Técnico e prazo mudam aqui mesmo; para corrigir o cliente ou o aparelho, ou para trocar o cliente da ordem, use Editar.",
    },
    {
      alvo: "senha",
      papeis: DONO_E_TECNICO,
      titulo: "Senha de desbloqueio",
      texto:
        "A senha só aparece quando você clica para ver, e cada consulta fica registrada. Se ela estiver errada, corrija ali mesmo. Ela é apagada sozinha sete dias depois da entrega.",
    },
    {
      alvo: "link-do-cliente",
      titulo: "Link do cliente",
      texto:
        "O cliente acompanha o reparo, vê o orçamento e as fotos por este link, sem criar conta. Copie ou veja como ele aparece para o cliente.",
    },
    {
      alvo: "documentos",
      titulo: "Comprovante",
      texto:
        "Imprima o comprovante de entrada para o cliente assinar no balcão. Quando o aparelho fica pronto, aparece aqui também o recibo com a garantia.",
    },
  ],
  painel: [
    {
      alvo: "periodo",
      titulo: "Período",
      texto:
        "Escolha de quando são os números: hoje, os últimos 7 dias, este mês ou as datas que quiser. Cada número vem comparado com o período anterior do mesmo tamanho.",
    },
    {
      alvo: "indicadores",
      titulo: "Como a loja está agora",
      texto:
        "O que está na bancada, o que passou do prazo, o que vence hoje, o que espera resposta do cliente, o que está pronto para retirada e o que precisa repor no estoque. Clique num número para ver a lista.",
    },
    {
      alvo: "dinheiro",
      papeis: ["dono"],
      titulo: "Dinheiro",
      texto:
        "Quanto entrou no caixa pelas ordens e pelas vendas no balcão, separado por PIX, dinheiro e cartão, os descontos dados, o que os clientes ainda devem e as contas que vencem logo. Só quem é dono vê esta parte.",
    },
    {
      alvo: "operacao",
      titulo: "Operação",
      texto:
        "Quantas ordens entraram e saíram no período e quanto tempo o reparo leva, do balcão até a entrega.",
    },
    {
      alvo: "etapas",
      titulo: "Onde o trabalho para",
      texto:
        "O tempo médio em cada etapa mostra o gargalo: orçamento esperando resposta, peça que demora a chegar ou aparelho pronto que o cliente não busca.",
    },
    {
      alvo: "equipe",
      papeis: ["dono"],
      titulo: "Equipe",
      texto: "Quantas ordens cada técnico entregou no período e quanto elas renderam.",
    },
    {
      alvo: "atendimento",
      titulo: "Atendimento",
      texto:
        "Os aparelhos e defeitos que mais aparecem ajudam a decidir quais peças ter em estoque. Os clientes que voltam mostram quem confia na loja.",
    },
  ],
  equipe: [
    {
      alvo: "pessoas",
      titulo: "Quem usa o sistema",
      texto:
        "Aqui você troca o papel de alguém, redefine a senha ou desativa quem saiu da loja. Desativar não apaga o histórico do que a pessoa fez.",
    },
    {
      alvo: "convidar",
      titulo: "Convidar pessoa",
      texto:
        "Informe o nome e o papel e mande o link do convite pelo WhatsApp. A pessoa abre o link e cria a própria senha, que só ela conhece.",
    },
    {
      alvo: "papeis",
      titulo: "Papéis",
      texto:
        "O que cada papel pode fazer. Na dúvida, comece com atendente: ele abre ordens e atende, mas não vê a senha dos aparelhos.",
    },
  ],
  estoque: [
    {
      alvo: "abas-do-estoque",
      titulo: "Estoque e vendas",
      texto:
        "Aqui ficam as peças e os acessórios da loja e as vendas feitas no balcão. A peça usada num conserto sai do estoque sozinha quando o cliente aprova o orçamento.",
    },
    {
      alvo: "cadastrar-produto",
      titulo: "Cadastrar produto",
      texto:
        "Cada produto tem custo, preço de venda e um mínimo. Quando a quantidade fica abaixo do mínimo, ele aparece em Para repor, aqui e no painel.",
    },
    {
      alvo: "nova-venda",
      titulo: "Venda no balcão",
      texto:
        "Capas, películas e carregadores vendidos no balcão: escolha os produtos e a forma de pagamento. O estoque baixa e o valor entra no painel.",
    },
    {
      alvo: "lista-do-estoque",
      titulo: "Os produtos",
      texto:
        "Clique num produto para registrar a compra que chegou, corrigir a contagem ou ver tudo o que entrou e saiu, com quem fez e quando.",
    },
  ],
  financeiro: [
    {
      alvo: "resumo-das-contas",
      papeis: ["dono"],
      titulo: "Contas a pagar",
      texto:
        "O que já venceu, o que vence nos próximos 7 dias e o que foi pago neste mês. Clique num número para ver as contas. Só quem é dono vê esta tela.",
    },
    {
      alvo: "lancar-conta",
      papeis: ["dono"],
      titulo: "Lançar conta",
      texto:
        "Aluguel, luz, salários, compras de peças: cada conta tem categoria e vencimento. A que se repete todo mês aparece sozinha, um mês antes de vencer.",
    },
    {
      alvo: "lista-de-contas",
      papeis: ["dono"],
      titulo: "As contas",
      texto:
        "O que vence primeiro fica no alto. Clique numa conta para marcar como paga, corrigir o valor ou parar de repetir.",
    },
    {
      alvo: "abas-do-financeiro",
      papeis: ["dono"],
      titulo: "Contas a receber",
      texto:
        "As ordens entregues que o cliente ainda não pagou inteiras ficam em Contas a receber, com o dia combinado para pagar.",
    },
    {
      alvo: "conta-da-equipe",
      papeis: ["tecnico", "atendente"],
      titulo: "Lançar conta",
      texto:
        "Lance a conta com o valor e o vencimento. Se o dinheiro já saiu da loja, como no motoboy pago na hora, marque Já está paga e diga como foi pago.",
    },
  ],
  "a-receber": [
    {
      alvo: "resumo-do-a-receber",
      papeis: ["dono"],
      titulo: "Contas a receber",
      texto:
        "O que passou do dia combinado, o que vence nos próximos 7 dias e o que os clientes pagaram neste mês. Só quem é dono vê esta tela.",
    },
    {
      alvo: "lista-do-a-receber",
      papeis: ["dono"],
      titulo: "Quem está devendo",
      texto:
        "O dia combinado que vence primeiro fica no alto. Clique numa ordem para registrar o pagamento, mudar o dia ou cobrar o cliente pelo WhatsApp.",
    },
  ],
};
