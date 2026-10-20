# 0035 — Lojas pela tela e fuso horário por assistência

## Contexto

Até aqui, a segunda loja só nascia pelo painel administrativo, e a página inicial mandava pedir pelo
WhatsApp (ADR 0026). No lançamento self-service, o dono precisa fazer isso sozinho, e uma loja que
fecha precisa sair da abertura de ordens sem levar junto as ordens que já tem.

Todas as horas do Bancada eram as de Brasília, fixas no Django e no site. O Brasil tem quatro fusos,
e uma assistência em Cuiabá ou em Manaus via as horas uma hora adiantadas no histórico, no
comprovante e no recibo. O "hoje" também virava à meia-noite de Brasília, às 23h de lá: uma ordem
prometida para o dia aparecia como atrasada antes da hora.

## Decisão

**Quatro fusos, não um por estado.** A assistência ganhou o campo `fuso_horario`, com os quatro
fusos do Brasil: Brasília, que é o padrão, Manaus, Rio Branco e Noronha. Desde 2019 o Brasil não tem
horário de verão, e os estados de cada fuso marcam a mesma hora. Na tela, cada opção é descrita em
relação a Brasília, como "Uma hora a menos que Brasília: AM, MT, MS, RO e RR", porque "UTC−4" não diz
nada para quem atende no balcão.

**Deduzido no cadastro e trocado na tela Assistência.** O cadastro deduz o fuso pelo DDD do
WhatsApp: 65, 66, 67, 69, 92, 95 e 97 vão para Manaus, 68 vai para Rio Branco e o resto fica em
Brasília. Noronha usa o DDD 81, de Pernambuco, e só se escolhe na tela. As assistências que já
existiam ficaram em Brasília, que era o horário de todas até aqui. O dono troca o fuso no campo
"Fuso horário", abaixo do WhatsApp, e a dica "Confira: agora são 14:05 nesse fuso." muda junto com a
escolha. Essa hora só é escrita no navegador: a do servidor pode estar num minuto e a do navegador no
seguinte, e o React acusaria a diferença ao ligar a página. A troca fica na auditoria, como as outras
alterações da assistência.

**Ativado a cada pedido, na autenticação.** Cada pedido autenticado por token ativa o fuso da
assistência, em `TokenQueRegistraAcesso`, que é o único ponto por onde passam todas as views da API.
O middleware `FusoDoPedido` volta ao fuso padrão no começo e no fim de cada pedido, para um pedido
não herdar o fuso do anterior na mesma thread. Com isso, seguem o fuso da assistência sem mudança em
cada lugar: "atrasada" e "para hoje" na lista e no painel, o prazo prometido que não pode ser antes
de hoje, o começo e o fim dos períodos do painel, as horas do comprovante e do recibo e as datas que
a API devolve. Nas tarefas do Celery, os avisos ao cliente, inclusive o recibo anexado na entrega, e
o e-mail de convite saem no fuso da assistência. O `SessionAuthentication`, que só o painel
administrativo usa, fica em Brasília.

No site, as telas da assistência recebem o fuso junto com o usuário, em `/api/auth/eu/`, e a página
do cliente, junto com a ordem. A página inicial, a demonstração e o painel da plataforma não
pertencem a nenhuma assistência e continuam em Brasília.

**Assinatura no horário de Brasília.** O teste grátis e a tolerância vencem à meia-noite de
Brasília, em `hoje_no_bancada()`, porque a cobrança é entre o Bancada e a loja, e o Asaas trabalha com
as datas de Brasília. No Acre, o teste grátis termina às 22h do último dia.

**Lojas na tela Assistência.** Cada loja ativa tem o seu cartão, com o formulário de antes, e o botão
Desativar no cabeçalho quando há mais de uma ativa. Abaixo ficam as lojas desativadas, com Reativar,
e o cartão "Nova loja", com o formulário recolhido atrás de "Adicionar loja", porque a maioria das
assistências tem uma loja só. O cartão explica que cada ordem fica com a loja onde foi aberta, que o
cliente vê o nome dessa loja e que o painel separa os números de cada uma.

Só o dono cria, edita, desativa e reativa lojas, e o modo só de consulta (ADR 0022) recusa tudo isso.
A lista continua aberta à equipe, porque a abertura de ordens e o painel a usam. O nome é obrigatório
e não se repete na assistência, sem diferenciar maiúsculas; o telefone é conferido como os outros, e
o endereço é opcional. A criação entra na auditoria com a ação nova `loja_criada`, e a desativação,
como as outras alterações da loja.

**Desativar em vez de apagar.** Uma loja com ordens não pode ser apagada sem levar o histórico junto,
e um botão só, que vale para qualquer loja, é mais simples de entender. Reativar desfaz, e a última
loja ativa não se desativa. A loja desativada some da abertura de ordens, e a API recusa abrir ordem
nela. As ordens que já estavam nela seguem até a entrega, e o filtro do painel continua mostrando a
loja, com "(desativada)" no nome, para os números do passado. O passo "Completar o endereço da loja"
dos primeiros passos olha só as lojas ativas.

**O nome da loja.** O cliente vê o nome da loja quando a assistência usa mais de uma (ADR 0025).
Agora contam as lojas ativas e as que têm ordens: uma loja criada por engano e desativada sem nenhuma
ordem não faz os clientes passarem a ver "· Matriz". A ficha da ordem ganhou a linha Loja, com o
mesmo critério.

**A loja escolhida continua depois de um erro.** O React limpa o formulário depois de cada envio, e
um `<select>` só lê o valor padrão quando nasce. Se a API recusasse a abertura da ordem, por exemplo
sem cliente escolhido, a loja voltava para a primeira da lista, e o envio seguinte abria a ordem na
loja errada. Agora a loja enviada volta com os outros campos, e o seletor é recriado com ela. O campo
de fuso tem o mesmo cuidado: sem ele, a tela voltava a mostrar o fuso antigo logo depois de salvar, e
um segundo Salvar o gravava de novo.

A página inicial passou a dizer "Você mesmo cadastra as outras lojas, na tela Assistência."

## Consequências

A API ganhou 44 testes, em `core/tests/test_fuso_horario.py` e `tenants/tests/test_lojas.py`. Os de
fuso param o relógio às 3h30 UTC do dia 20, meia-noite e meia em Brasília e 23h30 do dia 19 em
Manaus. Cada peça foi removida de propósito para conferir que algum teste falha sem ela: a ativação
no token, o middleware, os dois `timezone.override` e o `hoje_no_bancada`.

No site, as funções de data novas dão a mesma hora com o processo em UTC e nos quatro fusos, e um
teste de contrato confere que o site e a API oferecem os mesmos fusos. O teste de navegador novo
cria uma loja, tenta abrir uma ordem nela sem cliente e confere que a loja continua escolhida, abre a
ordem e vê a loja na ficha, desativa a loja e confere que ela some da abertura e passa a assistência
para o horário de Manaus, conferindo a hora da dica e a da ordem com um minuto de folga para cada
lado. O seletor de loja e o de fuso foram conferidos sem a correção do `<select>`, e o teste reprovou
nos dois.

Cada execução completa dos testes de navegador cria agora seis assistências, três por tamanho de
tela. Com o limite de 10 cadastros por hora (ADR 0033), uma segunda execução na mesma hora contra o
mesmo ambiente esbarra no limite. Na máquina, `THROTTLE_CADASTRO=100/hour` no `.env` sobe o limite.

Se o horário de verão voltar só para alguns estados, como antes de 2019, quando valia em MT e MS mas
não em AM, RO e RR, as opções precisam ser divididas. O DDD do WhatsApp continua guardado para refazer
a conta.

Uma rede com lojas em fusos diferentes usa o fuso da assistência em todas, e o painel administrativo
continua mostrando as horas de Brasília.

Ficaram de fora o filtro de loja na lista de ordens, que a API já aceita em `?loja=` e o painel já
tem, e a troca da loja de uma ordem aberta.

## Alternativas consideradas

**Uma opção por estado.** Seriam 27 opções para quatro horas diferentes. Quatro opções cobrem o país
enquanto não houver horário de verão.

**O fuso do aparelho de quem usa.** As horas mudariam conforme o celular de cada pessoa da equipe, e o
comprovante, o recibo e os e-mails, montados na API, não têm navegador. O "hoje" da lista e do painel
precisa ser o da loja.

**Ativar o fuso num middleware do Django.** O middleware roda antes da autenticação do DRF e não sabe
de quem é o token. Autenticar de novo ali consultaria o token duas vezes por pedido.

**Deduzir pelo DDD também as assistências que já existiam.** Mudaria as horas de quem já usava o
sistema, sem aviso. O dono escolhe na tela.

**A assinatura no fuso da assistência.** O teste grátis terminaria em horas diferentes para cada loja,
e os vencimentos do Asaas, em datas de Brasília, deixariam de bater com a tela Assinatura.

**Apagar a loja.** Só valeria para lojas sem ordens, e o botão sumiria justo quando a loja tem
histórico. Desativar vale para todas e se desfaz.

**Fuso por loja.** Atenderia uma rede com lojas em fusos diferentes, mas cada tela que junta lojas,
como o painel e a lista, precisaria escolher um fuso. Fica para quando aparecer uma rede assim.
