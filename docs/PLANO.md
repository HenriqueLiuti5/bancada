# Plano do projeto

## Problema

Assistências técnicas de celular controlam ordens de serviço em caderno, planilha ou grupo de
WhatsApp. O resultado é previsível: o cliente liga toda hora para perguntar do aparelho, o
técnico perde tempo respondendo, e quando há divergência sobre prazo, preço ou estado do
aparelho na entrada, não existe registro para resolver a discussão.

## Produto

O Bancada é um sistema onde a assistência registra cliente, aparelho e defeito, e acompanha a
ordem de serviço por uma sequência de estados até a entrega. Cada ordem gera um link público e
não adivinhável que a assistência manda ao cliente. O cliente abre o link sem criar conta e vê
a linha do tempo do reparo, o orçamento e as fotos do aparelho na entrada.

É um SaaS B2B com assinatura self-service: a assistência se cadastra sozinha e paga mensalidade.

## Domínio

```
Tenant (assistência)  ──< Loja ──< Usuário (dono | técnico | atendente)
Cliente (da assistência)  ──< Aparelho (marca, modelo, IMEI, senha, cor)

OrdemServico
  número, tenant, loja, cliente, aparelho, técnico responsável,
  status, problema relatado, diagnóstico, laudo,
  checklist de entrada, fotos, garantia, datas, token público
    ──< ItemOrcamento (peça ou serviço, valor, aprovado)
    ──< EventoOS (histórico imutável: quem, quando, de qual status para qual)
```

### Estados de uma ordem de serviço

```
RECEBIDO → EM_DIAGNOSTICO → ORCAMENTO_ENVIADO ─┬→ APROVADO → EM_REPARO ─┬→ PRONTO → ENTREGUE
                                               │                        └→ AGUARDANDO_PECA ↺
                                               └→ REPROVADO → DEVOLVIDO_SEM_REPARO
```

Transições são validadas explicitamente. Cada uma grava um `EventoOS`, que nunca é editado nem
apagado. Esse histórico é a trilha de auditoria do produto e será a base de dados da camada de
inteligência artificial na Fase 5.

## Dados sensíveis

O sistema armazena CPF, telefone, IMEI e, inevitavelmente, a senha ou o padrão de desbloqueio
do aparelho. Três regras decorrem disso e valem desde a primeira linha de código:

1. A senha de desbloqueio é criptografada em nível de campo, acessível apenas a usuários com
   papel técnico do próprio tenant, com acesso registrado em auditoria, e purgada automaticamente
   após a entrega do aparelho.
2. A página pública expõe o mínimo: status, linha do tempo, orçamento e fotos. Nunca IMEI
   completo, CPF ou endereço.
3. Fotos ficam em bucket privado, servidas por URL assinada com validade curta.

Na relação de LGPD, a assistência é a controladora dos dados dos clientes finais e o Bancada é
o operador.

## Roadmap

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Ambiente de desenvolvimento, CI, decisões registradas | concluída |
| 1A | Modelo de dados, máquina de estados e painel administrativo | concluída |
| 1B | API e telas em React: login, lista de OS, abertura e mudança de status | concluída |
| 1C | Página pública de acompanhamento | concluída |
| 1D | Fotos do aparelho e trava no banco (RLS) | concluída |
| 2A | Aviso ao cliente por e-mail, em tarefa assíncrona | concluída |
| 2B | PDF da ordem de serviço | concluída |
| 2C | Auditoria da senha, purga automática e tarefas periódicas | concluída |
| 3A | Busca, filtros e paginação na lista de ordens | concluída |
| 3B | Painel com os números do dia | concluída |
| 3C | Papéis, permissões e gestão da equipe | concluída |
| 4A | Cadastro da assistência, convite da equipe e recuperação de senha | concluída |
| 4B | Assinatura pelo Asaas, com teste grátis de 30 dias | concluída |
| 4C | Tutorial guiado e canal de contato | concluída |
| 4D | Pagamento na entrega e painel completo da loja | concluída |
| 4E | Painel da plataforma, exclusivo do Henrique | concluída |
| 4G | Revisão do design de todo o site | concluída |
| 4H | Página inicial e demonstração da página do cliente | concluída |
| 4I | Correção do cadastro e prazo prometido no dia a dia | concluída |
| 4J | Revisão de segurança antes da publicação | concluída |
| 4K | Conferência dos cadastros e tela da ordem guiada | concluída |
| 4L | Tela da ordem no modelo de chamado | concluída |
| 4M | Testes automáticos do site | |
| 4N | Troca do cliente da ordem e comentários internos no histórico | |
| 4O | Lojas pela tela e fuso horário por assistência | |
| 4P | Estoque de peças | |
| 4Q | Financeiro da loja | |
| 4R | Página inicial com telas novas | |
| 4S | Termos finais, privacidade e medição de visitas | |
| 4T | Planos e preços | |
| 4F | Publicação: domínio, termos, backup e monitoramento | em andamento |
| 5 | Inteligência artificial: tradutor técnico, triagem assistida, busca no histórico | |
| 6 | WhatsApp automático e relatórios além do painel | |

A Fase 1 termina quando uma assistência real conseguir abrir uma ordem de serviço e enviar o
link ao cliente. Nada que não sirva a essa frase entra antes.

A Fase 4 termina quando uma assistência que nunca falou com a gente conseguir se cadastrar,
montar a equipe, aprender a usar o sistema e assinar, tudo sozinha.

A publicação, Fase 4F, é a última do lançamento: o sistema vai para o ar depois de todas as outras.
As fases da 4G à 4T entraram no plano depois da 4F, por isso têm as letras seguintes, mas vêm antes
dela.

As da 4M à 4T saíram da revisão do que faltava, em 18 de outubro de 2026, e são feitas uma de cada
vez, nessa ordem. Os testes vêm primeiro, porque protegem as telas que as fases seguintes mexem. O
estoque e o financeiro entram antes do lançamento, para o Bancada chegar ao mercado com o que os
concorrentes já oferecem. A página inicial vem depois das mudanças nas telas, para mostrá-las
prontas. Os planos ficam por último, decididos pelo Henrique com o sistema pronto.

Depois do lançamento vêm a inteligência artificial, da Fase 5, e a Fase 6.

Até a Fase 3, o roadmap previa inteligência artificial na Fase 4, cobrança na 5 e publicação na 6.
O lançamento passou para a frente da inteligência artificial, e os ADRs escritos antes dessa
mudança usam a numeração antiga: as Fases 5 e 6 citadas neles fazem parte hoje da Fase 4, e a
Fase 4 citada neles é hoje a Fase 5.

O cache que a Fase 2 previa foi entregue antes, na Fase 1C: a leitura da página pública passa por
cache no Redis, no formato cache-aside, com invalidação por sinal. Nada mais no sistema tem hoje
volume de leitura que justifique cache, e cache sem necessidade só acrescenta caminhos para o
dado ficar velho.

## Fase 4: lançamento self-service

### Como a assistência chega ao produto

O Bancada é vendido à distância. A assistência recebe uma mensagem com o link, se cadastra, testa
e assina sem que ninguém vá até a loja, e a conversa sobre o que melhorar acontece pelo WhatsApp.
Tudo que um vendedor presente resolveria precisa, então, estar dentro do próprio produto: criar a
conta, montar a equipe, recuperar a senha, aprender as telas, pagar e pedir ajuda.

### 4A — Cadastro e contas

- O dono cria a assistência num formulário só: nome da assistência, nome dele, e-mail, WhatsApp,
  senha e aceite dos termos de uso. O formulário cria a assistência, a primeira loja e a conta do
  dono de uma vez, já dentro do teste grátis.
- O e-mail do dono é confirmado por link, sem bloquear o uso durante o teste. É por ele que chegam
  a recuperação de senha e as cobranças.
- O login passa a ser por e-mail. Hoje o nome de usuário é único no sistema inteiro (ADR 0016), o
  que não funciona quando cada assistência cria as próprias contas.
- Para adicionar um funcionário, o dono informa só o nome e o papel e recebe um link de convite
  para mandar pelo WhatsApp ou por e-mail. O funcionário abre o link, informa o próprio e-mail e
  cria a senha. A gestão da equipe da Fase 3C continua valendo: trocar papel e desativar conta.
- "Esqueci minha senha" por e-mail, para qualquer usuário.
- O dono edita os dados que aparecem para o cliente no comprovante, no recibo e nos avisos: nome
  da assistência, CNPJ, WhatsApp, e nome, telefone e endereço da loja. Sem isso, uma assistência
  que se cadastrou sozinha ficaria com o comprovante sem endereço.
- A abertura de ordem cadastra cliente e aparelho na mesma tela, com busca por nome ou telefone.
  Até aqui só existiam clientes criados pelo painel administrativo ou pelos dados de exemplo, e
  uma assistência nova não conseguia abrir nenhuma ordem.
- O orçamento é montado na tela da ordem, item por item, e trava quando é enviado ao cliente. Na
  aprovação, quem atende desmarca o que o cliente recusou. Até aqui os itens também só nasciam
  pelo painel administrativo, e nada marcava o que foi aprovado (ADR 0019).

### 4B — Assinatura pelo Asaas

- Toda assistência nova começa com 30 dias grátis, sem pedir forma de pagamento no cadastro.
- Nos últimos dias do teste, o dono recebe aviso na interface e por e-mail, e assina dentro do
  próprio sistema. A cobrança mensal é gerada pelo Asaas e paga por PIX, boleto ou cartão.
- A assinatura segue a máquina de estados do ADR 0006: `trial → ativa → inadimplente → suspensa →
  cancelada`. O webhook do Asaas tem a assinatura verificada e é idempotente.
- Inadimplente tem período de tolerância com aviso. Suspensa, ou teste vencido sem assinatura,
  passa a somente leitura. Os dados nunca são apagados por falta de pagamento.
- O dono tem uma tela com a situação da assinatura, as faturas e a forma de pagamento. Técnico e
  atendente não veem essa tela.
- O desenvolvimento usa o ambiente de testes do Asaas, que é gratuito.
- A lista de primeiros passos da Fase 4C ganha o passo de assinar.

Na entrega, a tolerância ficou em 7 dias contados do vencimento; quem assina durante o teste paga a
primeira mensalidade só no último dia do teste; e o dono pode cancelar pela tela, mantendo o acesso
até o fim do período já pago. A forma de pagamento fica em aberto na assinatura e é escolhida a cada
mês na página de pagamento do Asaas, sem tela no Bancada para isso (ADR 0022).

### 4C — Tutorial guiado e contato

- No primeiro acesso a cada tela principal, um tour destaca os botões um de cada vez, dizendo o
  que cada um faz e o que fazer em seguida: lista de ordens, abertura de ordem, detalhe da ordem,
  painel e equipe.
- O tour mostra só o que o papel do usuário enxerga: o do atendente não apresenta botões que ele
  não pode usar.
- O tour pode ser pulado e reaberto a qualquer momento pelo menu. O sistema guarda quais tours cada
  usuário já viu, para não repeti-los quando ele entrar por outro aparelho.
- Uma lista de primeiros passos acompanha o começo do teste: abrir a primeira ordem, mandar o link
  ao cliente, completar o endereço da loja e convidar a equipe. O passo de assinar entra com a
  Fase 4B (ADR 0020).
- Um botão "Fale com a gente" abre o WhatsApp do Henrique já com o nome da assistência na mensagem.

### 4D — Pagamento na entrega e painel completo da loja

O painel da Fase 3B mostra o estado de agora. Esta fase passa a registrar o dinheiro que de fato
entra no caixa e acrescenta resumos por período.

- Ao marcar a ordem como entregue, quem atende informa o valor recebido e a forma de pagamento:
  PIX, dinheiro, débito ou crédito. O valor já vem preenchido com o total aprovado e só é mudado
  quando há desconto. O pagamento pode ser dividido em mais de uma forma, e o aparelho entregue
  sem pagamento fica registrado como valor a receber até ser quitado.
- O recibo de entrega em PDF da Fase 2B passa a mostrar o valor pago e a forma de pagamento.

Com esse registro, o painel passa a ter:

- Escolha de período: hoje, últimos 7 dias, mês e intervalo personalizado, com comparação com o
  período anterior.
- Dinheiro: valor recebido no período, separado por forma de pagamento; descontos dados; valores a
  receber; ticket médio; valor aprovado ainda em aberto e taxa de aprovação de orçamentos.
- Operação: ordens abertas e entregues, atrasadas, tempo médio de reparo e tempo parado em cada
  etapa.
- Equipe: ordens concluídas e valor recebido por técnico.
- Atendimento: marcas e modelos mais atendidos, defeitos mais comuns e clientes que mais voltam.
- Filtro por loja, para assistências com mais de uma.
- Os números de dinheiro aparecem só para o dono. Técnico e atendente veem a parte de operação.

Na entrega, a seção de equipe também ficou só para o dono, por comparar colegas entre si, e os
defeitos mais comuns saem de palavras-chave no problema relatado (ADR 0021).

### 4E — Painel da plataforma

Uma área separada, visível apenas para a conta do Henrique.

- Dinheiro: receita recorrente mensal, valor recebido no mês, taxas do Asaas, custos do mês
  (servidor, domínio, e-mail e outros, registrados à mão) e lucro.
- Assinaturas: quantas estão em teste, ativas, inadimplentes, suspensas e canceladas; conversão de
  teste para assinatura; cancelamentos no mês.
- Crescimento: cadastros novos por semana e evolução da receita mês a mês.
- Uso: lista de assistências com dono, WhatsApp, data de cadastro, situação da assinatura, ordens
  abertas no período e último acesso. Ficam em destaque quem se cadastrou e não abriu nenhuma
  ordem e quem parou de usar, e um clique abre o WhatsApp do dono.
- Um e-mail avisa o Henrique a cada cadastro novo.

Este painel lê dados de todas as assistências, então atravessa o isolamento por RLS (ADR 0009) por
um caminho próprio, explícito e registrado em auditoria. Ele mostra números e o contato do dono,
nunca dados dos clientes finais das assistências.

Na entrega, a conta da plataforma ficou fora de qualquer assistência e é criada por comando no
servidor; os custos são lançados no próprio painel; e vêm primeiro na lista as assistências sem
nenhuma ordem 3 dias depois do cadastro e as que estão há 14 dias sem ordem nova. Para o último
acesso existir, cada pessoa passou a ter o horário de uso gravado, no máximo a cada 15 minutos
(ADR 0023).

### 4G — Revisão do design

Revisão do design de todo o site antes da publicação. O que muda é decidido no começo da fase.

Durante a fase, duas propostas foram descartadas: uma paleta escura, em grafite e verde-água, e
outra creme e verde, com cara de papel. O pedido final foi um sistema branco, com botões verdes bem
arredondados, barra lateral de uma cor mais escura que combine, ícones para representar cada coisa
e nenhuma poluição visual, seguindo os padrões de UI/UX.

Na entrega:

- Fundo quase branco com cartões brancos, botões verdes em pílula e barra lateral preta, que se
  recolhe para mostrar só os ícones. Cada combinação de texto e fundo passa no contraste mínimo da
  WCAG.
- Modo escuro em cinza-escuro neutro, com um verde próprio que combina com ele.
- Nada de vidro fosco nem fundo escurecido: tudo com cor sólida.
- Tour próprio no lugar do driver.js: o balão e o contorno deslizam de um passo para o outro, sem
  piscar e sem escurecer a tela.
- Ícones do Phosphor, de traço fino e sem fundo, em cada item do menu, cartão, seção, indicador do
  painel, status, linha do resumo da ordem e etapa da barra de andamento do cliente. Cinza quando só
  identificam a coisa; coloridos só quando a cor significa algo.
- Status como ícone na cor do grupo, seguido do nome em cinza, sem caixinha, como no GitHub e no
  Linear; avisos do topo da tela como cartões brancos com ícone, título e descrição.
- Fonte Plus Jakarta Sans, de formas arredondadas, no lugar da Geist.
- O sistema abre sempre claro; escuro e automático ficam como opção no menu da conta.
- No celular, navegação numa barra embaixo da tela, campos que não disparam o zoom do iPhone,
  botões do tamanho do dedo e filtros da lista recolhidos.
- Página do cliente com a barra de etapas com ícones, a previsão de entrega e o contato com a loja
  em destaque quando ele precisa responder ao orçamento ou retirar o aparelho.
- Marca nova, um "B" branco num quadrado verde, no sistema, no ícone da aba e da tela inicial do
  celular.
- Logo da assistência, enviada pelo dono na tela Assistência. Ela aparece para o cliente na página
  de acompanhamento, na prévia do link no WhatsApp, no e-mail, que ganhou versão em HTML, e no
  comprovante e no recibo. Quando a assistência tem mais de uma loja, o cliente vê também o nome
  da loja da ordem.

Os detalhes e as alternativas descartadas estão na ADR 0024; os da logo, na ADR 0025.

### 4H — Página inicial

O endereço principal, para onde vão as mensagens enviadas às assistências, passa a explicar o que é
o Bancada e a levar ao cadastro. A referência foram as técnicas da página da Inforos, não a
aparência dela.

Na entrega:

- Página inicial em `/` para quem não está logado; quem está logado continua indo direto para as
  ordens.
- Título com o resultado que a assistência ganha, botão "Testar grátis" com "30 dias grátis, sem
  cartão de crédito, sem instalar nada" logo abaixo e telas reais do sistema: a lista de ordens no
  computador e a página do cliente no celular.
- Recursos apresentados como dores resolvidas: o cliente perguntando se ficou pronto, a discussão
  do arranhão, a senha anotada no papel e o dinheiro que entrou e o que falta receber.
- Três fases em que a assistência se reconhece: sozinho no balcão, com técnico e atendente, mais de
  uma loja.
- Preço do plano único, lido da mesma configuração da cobrança, com tudo o que vem incluso e as
  condições de pagamento e cancelamento.
- Perguntas frequentes que respondem às objeções, botão do WhatsApp com mensagem pronta e chamada
  final numa faixa preta.
- Demonstração em `/demonstracao`: a página que o cliente final recebe, com uma ordem de exemplo, e
  botões para ver cada etapa do conserto.
- Título, descrição e imagem de prévia para buscadores e para o WhatsApp, `robots.txt` e
  `sitemap.xml`.

Nada de números de clientes nem depoimentos enquanto não houver clientes de verdade. A prova é o
próprio sistema, nas telas e na demonstração (ADR 0026).

### 4I — Correção do cadastro e prazos

A fase saiu da comparação com o InforOS, que tem telas de clientes e de equipamentos e abre com um
bloco de prazos. A garantia com prazo padrão, também sugerida nessa comparação, o Henrique dispensou.

**Correção do cliente e do aparelho.** Cliente e aparelho só eram cadastrados na abertura da ordem,
e nenhuma tela corrigia o que fosse anotado errado. Com o e-mail digitado errado, os avisos se
perdiam, e a assistência só consertava pedindo ao Henrique que mexesse no painel administrativo.
Na entrega:

- Botão "Editar" no cartão Propriedades da ordem, que leva à tela Cliente e aparelho: nome,
  telefone, e-mail e CPF do cliente; marca, modelo, cor e IMEI do aparelho. Qualquer papel corrige.
- A correção vale para todas as ordens do cliente, e a página de acompanhamento mostra o dado novo
  na hora.
- A senha de desbloqueio é corrigida no próprio cartão da senha, depois de revelada, só por técnico
  e dono e só com a ordem aberta. Cada troca fica registrada na auditoria.
- O IMEI corrigido fica só com os números, como na abertura, e o aparelho não muda de cliente.

Trocar o cliente de uma ordem aberta no cliente errado ficou de fora (ADR 0027).

**Prazo prometido.** O prazo só podia ser informado depois de abrir a ordem, então o comprovante
saía sem a previsão; o painel só avisava quando a ordem já tinha atrasado; e a lista mostrava quando
a ordem foi aberta, não quando precisa ficar pronta. Na entrega:

- Campo "Prazo prometido" na abertura da ordem, opcional e nunca antes de hoje. Ele sai no
  comprovante e na página de acompanhamento.
- Indicador "Para hoje" no painel, ao lado de "Atrasadas", e o mesmo recorte na lista de ordens.
- Coluna Prazo na lista, no lugar da data de abertura: "Hoje" com ícone laranja, "Ontem" ou "Há 3
  dias" com ícone vermelho, e a data nos demais casos. Ordem encerrada ou sem prazo mostra um traço.
- A imagem da lista na página inicial foi refeita com a coluna nova (ADR 0028).

### 4J — Revisão de segurança

O sistema foi comparado com uma lista de 50 itens de segurança para projetos Django. A maior parte
já estava coberta pelas fases anteriores; o que faltava e não dependia do servidor foi corrigido.
Na entrega:

- Fora do desenvolvimento, a API não sobe sem uma chave do Django própria e longa.
- Dez senhas erradas bloqueiam o e-mail por uma hora, e cada senha errada fica na auditoria.
- O token de login vence em 30 dias, como o cookie.
- O Next repassa à API o endereço real de quem acessa em todas as rotas, e a API e a auditoria o
  leem do mesmo jeito.
- Imagens acima de 25 megapixels são recusadas antes de abrir, cada ordem aceita até 30 fotos e
  cada pessoa envia até 120 por hora.
- O Next manda os cabeçalhos de segurança do navegador e o HSTS quando o acesso é por HTTPS.
- Saíram o pacote de CORS, o `PUT` de clientes e aparelhos e a mensagem de erro do health check, e
  as portas locais respondem só no próprio computador.
- O Next foi atualizado para uma versão sem falhas conhecidas, e um workflow confere as
  dependências toda semana (ADR 0029).

### 4K — Conferência dos cadastros e tela da ordem guiada

A fase saiu de uma lista de pedidos do Henrique depois de usar o sistema: não deixar salvar um
telefone errado, mostrar o que é obrigatório, deixar claro o que fazer em cada etapa da ordem e ter
o WhatsApp dele à mão para dúvidas. Na entrega:

- O telefone é conferido pelo DDD, pela quantidade de dígitos e pelo primeiro dígito, com uma
  mensagem que diz o que está errado. Quando está certo, o campo mostra "Confira: (43) 99615-6781,
  celular com DDD 43 (PR)". Vale para cliente, assistência e loja.
- O CPF ou CNPJ do cliente, quando preenchido, tem os dígitos verificadores conferidos e sai formatado
  no comprovante.
- Asterisco vermelho nos campos obrigatórios, com a legenda no alto de cada formulário.
- Na tela da ordem, o cartão "Próximo passo" diz o que fazer em palavras simples, com botões que
  nomeiam a ação e a principal em verde. O orçamento é montado dentro dele, um botão manda o link, o
  orçamento ou o aviso de pronto pelo WhatsApp do cliente, e fotos, anotações e histórico ficam em
  seções recolhidas.
- Botão do WhatsApp do suporte na página inicial, nas telas de entrar, cadastrar e recuperar a senha
  e no menu Ajuda, como "Entrar em contato com suporte".
- Perguntas frequentes e tela Assinatura com textos para leigos, explicando o que é o Asaas, e tela
  Equipe com o que cada papel pode fazer (ADR 0030).

### 4L — Tela da ordem no modelo de chamado

A fase saiu do pedido de deixar a tela da ordem simples, inspirada em como o Milvus, sistema de
chamados de TI, organiza o atendimento de um ticket: poucos botões para andar com o chamado, um
histórico com tudo o que aconteceu e os dados ao lado. Na entrega:

- Cartão de ação no alto, com uma barra fina de etapas, o que fazer em uma frase e os botões da
  etapa, com o verde sempre primeiro. Aprovar um orçamento com mais de um item, aguardar uma peça,
  entregar e receber o que faltava abrem um formulário curto no próprio cartão, com Confirmar e
  Cancelar; as outras ações continuam em um clique.
- Ficha "Dados da ordem" ao lado, ou logo abaixo do cartão no celular: cliente com WhatsApp,
  aparelho, defeito, técnico e prazo, que mudam ali mesmo, senha e link do cliente.
- Histórico, Orçamento, Fotos e Anotações em abas, abrindo na que a etapa pede.
- Histórico no estilo do log de um chamado: o mais recente primeiro, com quem fez, a ação e a hora.
  A abertura mostra o defeito, a entrega mostra o que foi pago, e os pagamentos posteriores ganham
  linha própria.
- Tour da tela refeito para as partes novas (ADR 0031).

### 4M — Testes automáticos do site

Até aqui só a API tem testes. O site passa pela verificação do código, dos tipos e da montagem, mas
nada abre as telas para ver se funcionam. Como as fases seguintes mexem nelas, os testes vêm antes:

- Testes que abrem o site num navegador de verdade e passam pelos caminhos principais: entrar, abrir
  uma ordem com cliente novo, enviar foto, montar e aprovar o orçamento, entregar com pagamento e
  abrir a página do cliente. Eles rodam na CI, sobre as imagens de produção.
- Testes das funções do site que conferem e formatam dados, como telefone, CPF e CNPJ, datas e
  dinheiro.
- O aviso do `braces`, que só existe no desenvolvimento, conferido de novo (ADR 0029).

### 4N — Troca do cliente da ordem e comentários internos

- Trocar o cliente de uma ordem aberta no cliente errado, o caso da Maria Silva da ADR 0027: a ordem
  passa para o cliente certo, e a troca fica no histórico e na auditoria.
- Comentários internos no histórico da ordem: qualquer pessoa da equipe escreve uma anotação a
  qualquer momento, sem mudar de etapa, e ela aparece no histórico com quem escreveu e a hora, como
  num chamado (ADR 0031). Só a equipe vê; o cliente, não.

### 4O — Lojas pela tela e fuso horário

- Tela para o dono criar, editar e desativar lojas. Até aqui, a segunda loja só nascia pelo painel
  administrativo, a pedido pelo WhatsApp (ADR 0026).
- Fuso horário por assistência, escolhido na tela Assistência. Os horários das telas, dos documentos
  e dos avisos e as contas de "hoje" e "atrasada" passam a seguir o fuso dela. O Brasil tem quatro
  fusos, e uma assistência em Cuiabá ou em Manaus via as horas uma hora adiantadas.

### 4P — Estoque de peças

Os sistemas concorrentes controlam as peças no mesmo lugar das ordens. O que entra é decidido no
começo da fase, a partir do que eles oferecem. O ponto de partida:

- Cadastro de peças e produtos, como telas, baterias e conectores, com custo, preço, quantidade e um
  mínimo para avisar quando o estoque estiver baixo.
- Entrada das peças compradas, com o fornecedor e o custo.
- A peça usada num conserto sai do estoque pelo orçamento da ordem, e cada ordem mostra o lucro: o
  que foi cobrado menos o custo das peças.
- Venda de acessórios no balcão, como capas, películas e carregadores, se fizer sentido.

### 4Q — Financeiro da loja

Hoje o Bancada registra o que entra pelas ordens, na entrega, e o que ficou a receber (4D). O
financeiro completa o caixa da loja. O que entra é decidido no começo da fase; o ponto de partida:

- Despesas da loja, como aluguel, peças, salários e contas, com categoria e vencimento.
- Contas a pagar e a receber num lugar só, com aviso do que está para vencer.
- Caixa do dia: o que entrou, o que saiu e o saldo, por forma de pagamento.
- Lucro do mês no painel: o que entrou menos as despesas e o custo das peças.

A emissão de nota fiscal, que os concorrentes vendem à parte, também é decidida no começo da fase.

### 4R — Página inicial com telas novas

Vem depois das fases que mudam as telas, da 4N à 4Q, para mostrá-las como vão ficar:

- Telas do sistema capturadas de novo em alta resolução, com dados de exemplo realistas, e servidas
  com mais qualidade, sem o borrado nas letras pequenas.
- Celular e notebook desenhados em volta das telas, sem marca.
- Fotos e imagens em PNG escolhidas pelo Henrique, onde couberem.
- O estoque e o financeiro apresentados entre os recursos.

Depoimentos só entram quando houver clientes reais que autorizem (ADR 0026).

### 4S — Termos, privacidade e medição de visitas

- Texto final dos termos de uso e da política de privacidade, a partir do rascunho da ADR 0032. Ele
  identifica o Henrique pelo nome, com o e-mail, o WhatsApp do suporte e o horário de atendimento,
  de segunda a sexta, das 8h30 às 17h, sem CPF, endereço nem foro. Os pontos que ficaram entre
  colchetes são resolvidos com escolhas simples, e os nomes dos provedores entram na publicação.
- Medição de visitas e de cadastros vindos da página inicial com o Umami, instalado no próprio
  servidor. Ele não usa cookies, o que dispensa o aviso de cookies.

### 4T — Planos e preços

Perto da publicação, o Henrique revisa o sistema e decide os planos, os preços, o desconto do
pagamento anual e se haverá um programa de fundadores. Em outubro de 2026, os sistemas feitos para
assistência técnica cobravam de R$ 49 a R$ 489,90 por mês, pelo número de pessoas e de lojas, e os
mais baratos já tinham estoque e financeiro.

A proposta de partida é cobrar pelo tamanho da assistência, com todos os recursos em todos os
planos: Solo, com 1 loja e até 2 pessoas; Equipe, com 1 loja e pessoas ilimitadas; e Rede, com mais
de uma loja. A fase faz a escolha do plano na tela Assinatura, os limites de pessoas e de lojas, a
troca de plano e os planos na página inicial.

### 4F — Publicação

O que não dependia de decisão ficou pronto na preparação do servidor de produção, em
`infra/producao/` (ADR 0032):

- Servidor inteiro descrito num Compose só, com o Caddy na frente: HTTPS automático e o endereço
  real de quem acessa no `X-Forwarded-For`, com API, banco e Redis fora da internet.
- Imagens de produção sem root: a API no gunicorn e o site no servidor `standalone` do Next.
- Painel administrativo do Django acessível só por túnel SSH, sem rota pública.
- Três papéis no banco: o superusuário cria o banco e faz o backup, o dono das tabelas roda as
  migrações e a aplicação só lê e grava. A API não sobe com um papel que passe por cima do RLS.
- Trava de instância única do Celery Beat (ADR 0013).
- Backup diário do banco, das fotos e das logos, restaurado num banco de teste a cada cópia e
  criptografado no envio para fora do servidor, com a restauração testada de ponta a ponta. A chave
  de criptografia fica longe do backup (ADR 0029).
- Fotos e logos num armazenamento compatível com S3, quando configurado (ADR 0010).
- Monitoramento de erros da API, das tarefas e do site, sem dados pessoais, e a rota `/saude` para
  um serviço de disponibilidade.
- CSP de produção conferida no navegador, sem bloqueios.
- Rascunho dos termos de uso e da política de privacidade, deixando claro que o Bancada é o operador
  dos dados dos clientes finais.
- Job da CI que monta as imagens de produção e as roda como em produção.

Falta, e depende de decisões ou de contratar serviços:

- Verificação em duas etapas na conta da plataforma, feita na véspera do lançamento para não
  atrapalhar os testes até lá (ADR 0029).
- Domínio e HTTPS: registrar o domínio e apontá-lo para o servidor.
- Servidor, e-mail por provedor com domínio verificado (ADR 0011), destino do backup e, se for o
  caso, armazenamento das fotos e serviço de monitoramento, com os nomes deles na política de
  privacidade.
- Asaas em produção.
- Número do WhatsApp do suporte configurado no servidor, fora do repositório (ADR 0030).
- Entrega contínua: publicar as imagens montadas pela CI num registro e fazer o servidor buscá-las.
- Prévia do link da página inicial conferida no WhatsApp, com o endereço público (ADR 0026).
- Com o backup no ar, a resposta sobre segurança da página inicial passa a citá-lo.

### Decisões em aberto

Ficam para quando cada parte chegar:

- Planos e preços, decididos pelo Henrique depois de revisar o sistema pronto (4T).
- Documentos que o Asaas exige para receber (CPF ou CNPJ) e emissão de nota fiscal.
- Nome do domínio.
- Provedores de servidor, e-mail, armazenamento e monitoramento.
