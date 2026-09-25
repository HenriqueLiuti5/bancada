export type NomeDoTour = "ordens" | "nova-ordem" | "ordem" | "painel" | "equipe";

export type Parada = {
  alvo?: string;
  titulo: string;
  texto: string;
  papeis?: string[];
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
        "Troque a visão da lista com um clique. Atrasadas são as ordens que passaram do prazo prometido ao cliente.",
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
      titulo: "Ajuda",
      texto:
        "Para ver este tour de novo ou falar com a gente pelo WhatsApp, use este botão. Quando estiver pronto, abra uma ordem em Nova ordem.",
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
      titulo: "Defeito",
      texto:
        "Escreva o problema como o cliente contou. O texto sai no comprovante que ele assina no balcão.",
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
      alvo: "mudar-status",
      titulo: "Mudar status",
      texto:
        "Cada botão leva a ordem para a próxima etapa, e só aparecem as etapas possíveis agora. O cliente é avisado nas que interessam a ele, como orçamento pronto e aparelho pronto para retirada.",
    },
    {
      alvo: "link-do-cliente",
      titulo: "Link do cliente",
      texto:
        "Mande este link pelo WhatsApp. O cliente acompanha o reparo, vê o orçamento e as fotos sem precisar criar conta.",
    },
    {
      alvo: "documentos",
      titulo: "Comprovante",
      texto:
        "Imprima o comprovante de entrada para o cliente assinar no balcão. Quando o aparelho fica pronto, aparece aqui também o recibo com a garantia.",
    },
    {
      alvo: "orcamento",
      titulo: "Orçamento",
      texto:
        "Monte o orçamento item por item, com peças e serviços. Ele trava quando é enviado ao cliente, e na aprovação você desmarca o que ele recusou.",
    },
    {
      alvo: "fotos",
      titulo: "Fotos do aparelho",
      texto:
        "Fotografe o aparelho na entrada. Riscos e trincas registrados evitam discussão na hora da entrega.",
    },
    {
      alvo: "senha",
      papeis: DONO_E_TECNICO,
      titulo: "Senha de desbloqueio",
      texto:
        "A senha só aparece quando você clica para ver, e cada consulta fica registrada. Ela é apagada sozinha sete dias depois da entrega.",
    },
    {
      alvo: "historico",
      titulo: "Histórico",
      texto:
        "Cada mudança de status fica registrada com quem fez e quando, e não pode ser apagada. É o que resolve qualquer dúvida depois.",
    },
  ],
  painel: [
    {
      alvo: "indicadores",
      titulo: "Como a loja está agora",
      texto:
        "O que está na bancada, o que passou do prazo, o que espera resposta do cliente e o que está pronto para retirada. Clique num número para ver essas ordens.",
    },
    {
      alvo: "indicadores-extras",
      titulo: "Mais números",
      texto:
        "Peças que faltam, o valor aprovado que ainda vai entrar, o tempo médio de reparo e o movimento do dia.",
    },
    {
      alvo: "fila",
      titulo: "Fila por status",
      texto:
        "Quantas ordens estão em cada etapa. Uma fila grande numa etapa mostra onde o trabalho está parando.",
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
};
