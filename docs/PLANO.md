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
    ──< RegistroOS (comentários da equipe e troca de cliente, também imutáveis)
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
| 4M | Testes automáticos do site | concluída |
| 4N | Troca do cliente da ordem e comentários internos no histórico | concluída |
| 4O | Lojas pela tela e fuso horário por assistência | concluída |
| 4P | Estoque de peças e venda no balcão | concluída |
| 4Q | Financeiro da loja | concluída |
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

Até aqui só a API tinha testes, e nada abria as telas do site. Como as fases seguintes mexem nelas,
os testes vieram antes. Na entrega:

- Testes que abrem o site num navegador de verdade e fazem o caminho de uma assistência nova: criar
  a conta, sair e entrar, abrir uma ordem com cliente e aparelho novos, enviar foto, montar, enviar
  e aprovar o orçamento, consertar, entregar com o pagamento dividido, baixar os PDFs e abrir a
  página do cliente sem estar logado. Também abrem as páginas públicas e a demonstração. Rodam no
  tamanho de computador e no de celular, e qualquer erro no console ou violação da CSP reprova.
- Na CI, esses testes rodam sobre as imagens de produção, no mesmo job que já as subia como no
  servidor.
- Testes das funções do site que conferem e formatam dados: telefone, CPF e CNPJ, datas em qualquer
  fuso do Brasil, dinheiro, WhatsApp e erros dos formulários. Outros três conferem que o site e a
  API aceitam os mesmos DDDs, gravam a mesma versão dos termos e limitam a foto ao mesmo tamanho.
- O aviso do `braces` conferido de novo: continua sem correção e só no desenvolvimento (ADR 0033).

### 4N — Troca do cliente da ordem e comentários internos

A ordem aberta no cliente errado, o caso da Maria Silva da ADR 0027, não tinha conserto: corrigir os
dados mudava o cadastro de outra pessoa. E o histórico no modelo de chamado da 4L ainda não aceitava
anotações da equipe. Na entrega:

- Troca do cliente de uma ordem aberta, pela tela Cliente e aparelho. O cliente certo vem da busca ou
  é cadastrado na hora. O aparelho vai junto quando só tem aquela ordem; quando tem outras, fica com o
  cliente errado, e a tela pede o aparelho do certo, já cadastrado ou novo.
- A troca gera um link de acompanhamento novo, porque o antigo pode ter chegado à pessoa errada, e
  fica no histórico, com quem fez e quando, e na auditoria.
- Comentários no histórico: qualquer pessoa da equipe escreve, em qualquer etapa e sem mudar de
  etapa, e o comentário aparece com quem escreveu e a hora. O cliente não vê, nem na página dele, nem
  nos PDFs e nos e-mails.
- Teste de navegador do comentário e da troca, no computador e no celular (ADR 0034).

### 4O — Lojas pela tela e fuso horário

Até aqui, a segunda loja só nascia pelo painel administrativo, a pedido pelo WhatsApp (ADR 0026), e
todas as horas eram as de Brasília: uma assistência em Cuiabá ou em Manaus via as horas uma hora
adiantadas. Na entrega:

- Fuso horário por assistência, entre os quatro do Brasil, deduzido do DDD do WhatsApp no cadastro e
  trocado na tela Assistência, que mostra a hora de agora no fuso escolhido. As horas das telas, dos
  documentos e dos e-mails e as contas de "hoje" e "atrasada" seguem o fuso da assistência. A
  assinatura continua no horário de Brasília, como as cobranças do Asaas.
- O dono cria, edita, desativa e reativa lojas na tela Assistência. A loja desativada some da
  abertura de ordens, as ordens dela seguem até a entrega, e o painel continua filtrando por ela.
- A ficha da ordem mostra a loja quando a assistência usa mais de uma, e a loja escolhida na abertura
  não volta mais para a primeira da lista quando a API recusa o envio.
- Testes do fuso e das lojas na API, das datas em cada fuso no site e um teste de navegador que cria,
  usa e desativa uma loja e passa a assistência para o horário de Manaus (ADR 0035).

Depois da entrega, a mesma correção chegou aos outros formulários. O papel, na tela Equipe, e o
técnico, na ficha da ordem, passaram a mostrar o valor gravado logo depois de salvar. Depois de uma
recusa, cada formulário continua com o que foi enviado, inclusive a forma de pagamento de cada linha
da entrega e os itens desmarcados na aprovação, que antes voltavam ao valor inicial e saíam errados
no envio seguinte (ADR 0035).

### 4P — Estoque de peças e venda no balcão

Os sistemas concorrentes controlam as peças no mesmo lugar das ordens, e os mais baratos já vendiam
no balcão. No começo da fase, o Henrique decidiu que a venda no balcão entra, que cada loja tem o seu
estoque, que a peça sai na aprovação do orçamento e que toda a equipe cuida do estoque e vê custo e
lucro. Na entrega:

- Cadastro de peças e acessórios, com código opcional para o leitor de código de barras, custo,
  preço de venda e estoque mínimo. A quantidade é a soma das movimentações, cada uma com quem fez e
  quando: estoque inicial, entrada de compra com fornecedor e custo, peça usada em ordem, venda,
  venda desfeita, correção da contagem e transferência entre lojas. O custo é a média do que a loja
  pagou.
- A peça do estoque entra no orçamento com o nome e o preço, e sai da loja da ordem quando o cliente
  aprova. Sem a peça, o estoque fica negativo e o produto entra em Para repor. A ordem mostra o custo
  das peças e o lucro, com o custo guardado na entrega.
- Venda no balcão com os produtos, o desconto e as formas de pagamento divididas, mostrando custo e
  lucro. Só o dono desfaz uma venda, e os produtos voltam ao estoque.
- No painel, as vendas somam ao recebido, e o indicador Para repor aparece para toda a equipe.
- A mudança de etapa da ordem trava a ordem, e dois pedidos ao mesmo tempo não aprovam nem entregam
  a mesma ordem duas vezes.
- Testes da API, das contas da venda no site e um teste de navegador do caminho inteiro, no
  computador e no celular (ADR 0036).

Ficaram de fora os aparelhos à venda controlados pelo IMEI, a importação da nota do fornecedor, o
recibo da venda em PDF, o aviso de estoque baixo por e-mail e o fiado no balcão.

### 4Q — Financeiro da loja

O Bancada registrava o que entra, pelas ordens (4D) e pelo balcão (4P), e nada do que sai. Os
concorrentes que cobram até R$ 60 por mês já tinham contas a pagar e a receber, contas fixas, caixa do
dia e lucro com o custo das peças, e alguns, comissão e fiado; a nota fiscal costuma ser vendida à
parte. No começo da fase, em 22 de outubro de 2026, o Henrique decidiu que qualquer pessoa da equipe
lança uma conta, mas só o dono vê a lista, os totais e o lucro; e que o caixa do dia mostra o resumo e
confere o dinheiro no fim do dia, sem ninguém precisar abrir o caixa. Comissão dos técnicos, taxa da
maquininha e nota fiscal ficaram de fora. O fiado no balcão chegou a entrar, mas em 25 de outubro o
Henrique decidiu deixá-lo fora do sistema.

A fase é feita em quatro partes, uma de cada vez:

1. Contas a pagar (concluída).
2. Contas a receber num lugar só: o que falta receber das ordens, com a data combinada para pagar e
   o aviso do que venceu (concluída).
3. Caixa do dia: o que entrou e o que saiu em cada forma de pagamento, a conferência do dinheiro da
   gaveta no fim do dia e as retiradas e reforços (concluída).
4. Lucro do mês no painel: o que entrou menos as despesas e o custo das peças (concluída).

Na entrega da parte 1:

- Tela Financeiro no menu. Qualquer pessoa da equipe lança a conta que chegou, com categoria, valor e
  vencimento, ou já paga, com a data e a forma, como o motoboy pago com o dinheiro da gaveta. Só o dono
  vê a lista e os totais, corrige, paga e remove, e a remoção fica na auditoria.
- Contas a pagar do dono: o que venceu, o que vence nos próximos 7 dias e o que foi pago no mês no
  alto; abas A pagar, Vencidas e Pagas; busca e filtro por categoria. O vencimento aparece como o
  prazo das ordens, com "Há 2 dias" em vermelho e "Hoje" em laranja.
- Pagamento com o valor de verdade, para juros e descontos, a data e a forma, que pode ser desfeito.
- Contas que se repetem todo mês: a de cada mês aparece sozinha um mês antes de vencer. Mudar também
  as próximas leva o valor novo do aluguel para os meses seguintes, e Parar de repetir encerra.
- No painel, A pagar logo soma o que venceu com o que vence nos próximos 7 dias, em vermelho quando
  há conta vencida.
- No celular, a Assinatura passou da barra de baixo para o menu da conta, para a barra do dono
  continuar com seis itens.
- Testes da API, das contas do site, do contrato das categorias com a API e um teste de navegador do
  caminho inteiro, no computador e no celular (ADR 0037).

As compras de peças entram como conta a pagar, mas não vão contar como despesa no lucro da parte 4,
que já desconta o custo das peças usadas e vendidas.

No começo da parte 2, o Henrique decidiu que o dia combinado é obrigatório, que qualquer pessoa da
equipe o muda e que a ordem cobra o cliente pelo WhatsApp. Na entrega da parte 2:

- Na entrega com parte do valor para depois, quem entrega informa o dia em que o cliente combinou
  pagar o resto, nunca antes de hoje. Ele sai no recibo.
- Quando o cliente pede mais prazo, qualquer pessoa da equipe muda o dia na ordem, e cada dia
  combinado fica no histórico, com quem fez e quando.
- O cartão da ordem diz até quando o cliente combinou pagar, em vermelho quando venceu, e tem Cobrar
  no WhatsApp, com uma mensagem pronta com o valor e o dia.
- Contas a receber, ao lado de Contas a pagar, no Financeiro do dono: o que venceu, o que vence nos
  próximos 7 dias e o que os clientes pagaram no mês; abas A receber, Vencidas e Recebidas; e busca
  pelo cliente, pelo aparelho ou pelo número da OS.
- No painel, A receber fica em vermelho quando há pagamento vencido e leva às Contas a receber.
- Dados de exemplo com contas a receber vencidas, a vencer e quitadas.
- Testes da API, das contas do site e um teste de navegador do caminho inteiro, no computador e no
  celular (ADR 0037).

No começo da parte 3, o Henrique decidiu que técnico e atendente contam o dinheiro da gaveta sem ver
quanto devia ter e que o painel do dono avisa quando faltou dinheiro. Na entrega da parte 3:

- Caixa do dia, ao lado das contas, no Financeiro. O dono vê a gaveta de cada loja: com quanto
  começou o dia, o dinheiro que entrou e saiu, as retiradas, os reforços, cada conferência e quanto
  deve ter agora. Vê também o que entrou e saiu em cada forma de pagamento e cada ordem paga, venda,
  venda desfeita, conta paga, retirada e reforço do dia, com quem fez. As setas mostram os outros
  dias.
- Ninguém abre o caixa: a primeira contagem da loja é o ponto de partida, e cada conferência parte
  do que ficou na gaveta na anterior. Quem conta diz quanto tem e quanto vai tirar para o cofre ou o
  banco; o resto fica de troco para o dia seguinte. Contar de novo vale, e todas as contagens ficam
  guardadas.
- As contas pagas em dinheiro e as vendas desfeitas saem da gaveta. Com mais de uma loja, só saem
  dela as contas da própria loja.
- Técnico e atendente registram retiradas, reforços e conferências sem ver quanto devia ter nem o
  resumo do dia. Só o dono vê se bateu, quanto sobrou ou faltou, e remove a retirada ou o reforço
  lançado errado, com registro na auditoria.
- No painel, Caixa mostra a diferença da última conferência de cada loja, em vermelho quando faltou
  dinheiro. Os números do dinheiro passaram a ficar em duas linhas de três.
- Testes da API, das contas do site e um teste de navegador do caminho inteiro, com uma atendente
  convidada, no computador e no celular (ADR 0037).

No começo da parte 4, o Henrique decidiu que o lucro parte do que entrou, como o Recebido do painel,
que segue o período escolhido no alto do painel e que o painel mostra também o lucro dos últimos
seis meses. Na entrega da parte 4:

- No painel do dono, Lucro no período: o que entrou pelas ordens e pelo balcão, menos o custo das
  peças das ordens entregues e das vendas e as contas pagas no período, com as maiores contas por
  categoria, quanto do que entrou sobrou e a comparação com o período anterior. Quando o resultado
  é negativo, o cartão diz Prejuízo no período, em vermelho.
- As compras de peças não entram como conta, porque o custo das peças já conta o que foi usado e
  vendido. As peças digitadas sem custo nas ordens entregues ganham um aviso: o lucro de verdade é
  menor.
- Lucro mês a mês, ao lado: os últimos seis meses, com o lucro subindo da linha do zero em verde e
  o prejuízo descendo em vermelho, o valor do mês atual e do maior escritos, e a tabela com os
  números de cada mês.
- Com o painel filtrado por uma loja, entram só o que ela recebeu e as contas dela.
- Testes da API, das contas do site e o teste de navegador do financeiro, que confere o prejuízo
  do mês no painel, no computador e no celular (ADR 0037).

### 4R — Página inicial com telas novas

Vem depois das fases que mudam as telas, da 4N à 4Q, para mostrá-las como vão ficar:

- Telas do sistema capturadas de novo em alta resolução, com dados de exemplo realistas, e servidas
  com mais qualidade, sem o borrado nas letras pequenas.
- Celular e notebook desenhados em volta das telas, sem marca.
- Fotos e imagens em PNG escolhidas pelo Henrique, onde couberem.
- O estoque e o financeiro apresentados entre os recursos, com produtos e vendas de exemplo no
  `semear` para as telas.

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

### Defeitos conhecidos

Notados na correção dos formulários, em 20 de outubro de 2026, e ainda sem correção:

- Na aprovação sem nenhum item marcado, a recusa diz "Marque ao menos um item. Se o cliente recusou
  tudo, use Reprovado.", mas o botão da tela se chama "O cliente recusou". O texto está em
  `apps/api/bancada/ordens/serializers.py`.
- Quando outra pessoa já mudou a etapa da ordem, quem tenta a mesma mudança vê a mensagem técnica da
  API, com os nomes internos das etapas. Na entrega feita por duas pessoas ao mesmo tempo, a segunda
  vê "Não é possível ir de 'entregue' para 'entregue'. A partir de 'entregue' só: nenhum." O texto
  sai de `apps/api/bancada/ordens/estados.py`.

O teste de navegador dos formulários (`apps/web/e2e/formularios.spec.ts`) procura o começo das duas
mensagens e precisa mudar junto com elas.
