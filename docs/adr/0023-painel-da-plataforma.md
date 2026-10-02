# 0023 — Painel da plataforma

## Contexto

O Bancada é vendido à distância (Fase 4): a assistência se cadastra, testa e assina sem falar com
ninguém. Para isso funcionar, o Henrique precisa saber, sem abrir o banco de dados, quem se
cadastrou, quem está usando, quem parou e quanto dinheiro entrou. Até aqui, nada disso existia fora
do painel administrativo do Django, que mostra tabelas cruas e não faz contas.

O isolamento entre assistências é a regra mais forte do sistema: cada requisição da API fixa a
assistência de quem pede, e o Row Level Security esconde as outras (ADR 0009). Um painel que lê
todas as assistências precisa atravessar essa regra, e esse atravessamento tem de ser explícito,
estreito e registrado.

Três decisões foram tomadas pelo Henrique ao começar a fase: a conta da plataforma fica fora de
qualquer assistência; os custos do mês são lançados no próprio painel; e uma assistência "parou de
usar" quando passa 14 dias sem ordem nova, e "não começou" quando chega a 3 dias do cadastro sem
nenhuma ordem.

## Decisão

### Uma conta fora das assistências

O usuário ganhou o campo `da_plataforma`. Uma restrição no banco garante que a conta da plataforma
não tem assistência nem papel, então a mesma sessão nunca enxerga os dados de uma loja e os números
de todas ao mesmo tempo, e a auditoria nunca fica em dúvida sobre em nome de quem algo foi feito.

A conta nasce por comando, no servidor: `make conta-da-plataforma` pergunta nome, e-mail e senha, e
a senha passa pelos mesmos validadores do resto do sistema. Ela entra pela tela de login de sempre,
e o Next a leva para `/plataforma`. Se ela abrir uma tela de assistência, volta para o painel; se uma
conta de assistência abrir `/plataforma`, recebe 404. A barreira de verdade é a API: as rotas da
plataforma exigem a permissão `ApenasPlataforma`, e as rotas das assistências continuam recusando
quem não pertence a uma.

O "esqueci minha senha" não atende a conta da plataforma, porque a recuperação exige uma assistência.
É de propósito: a conta que vê os números de todas as assistências não ganha um caminho de troca de
senha por e-mail. A senha muda pelo servidor, com `manage.py changepassword`.

### Atravessar o isolamento de propósito

As views da plataforma herdam de `ViewDaPlataforma`. Depois de conferir a permissão, ela chama
`ver_todas_as_assistencias()`, que deixa a variável do RLS vazia, e a política do ADR 0009 libera
todas as linhas. A chamada é explícita mesmo sendo o estado inicial de uma transação nova: um teste
fixa uma assistência antes do pedido e confere que o painel continua vendo todas. Sem a chamada, esse
teste falha.

Cada consulta ao painel fica na auditoria, como `plataforma_consultada`, com a conta, o endereço de
origem e o mês consultado. Lançar e remover um custo também ficam registrados. Esses registros não
pertencem a nenhuma assistência, então a tabela de auditoria passou a aceitar registros sem
assistência e deixou de herdar `PertenceAoTenant`. O RLS continua ligado nela: um registro sem
assistência nunca é igual à assistência fixada na sessão, então nenhuma assistência vê os registros
da plataforma.

O painel mostra números e o contato do dono de cada assistência: nome, e-mail e WhatsApp. Nunca
mostra os clientes delas, nem aparelhos, nem ordens individuais.

### Os números

Tudo é calculado na hora, como os outros painéis (ADR 0015). Cada número tem uma definição só:

| Número | Como é calculado |
|---|---|
| Recebido | Soma das faturas pagas com data de pagamento no mês |
| Taxas do Asaas | Valor menos valor líquido das faturas pagas no mês |
| Custos | Soma dos custos lançados para o mês |
| Lucro | Recebido, menos taxas, menos custos |
| Receita recorrente | Soma da mensalidade das assinaturas ativas e das com pagamento atrasado, ainda na tolerância |
| Situação agora | Quantas assinaturas há em cada situação |
| Conversão do teste | Das assistências que já decidiram, quantas assinaram |
| Assinaturas novas e cancelamentos | Assinaturas feitas e canceladas no mês |
| Cadastros por semana | Assistências criadas em cada semana, de segunda a domingo, nas últimas 12 |
| Recebido por mês | Faturas pagas em cada um dos últimos 12 meses |
| Ordens no mês | Ordens abertas no mês, por assistência |
| Último acesso | O mais recente entre as pessoas da equipe da assistência |

"Já decidiram", na conversão, quer dizer quem assinou em algum momento, mesmo que tenha cancelado
depois, e quem deixou o teste vencer sem assinar. Quem ainda está no teste fica de fora, porque
ainda não respondeu à pergunta.

A situação de cada assinatura vem da coluna `situacao`, a fotografia que o ADR 0022 criou para
listagens como esta. Ela é atualizada pelos avisos do Asaas e pela revisão das 7h.

O painel abre no mês atual e navega para trás até o mês do primeiro cadastro; mês que ainda não
chegou é recusado. O mês escolhido vale para o dinheiro, para as assinaturas novas e canceladas e
para as ordens de cada assistência. A situação, a receita recorrente e a conversão são de agora, e
os gráficos cobrem sempre as últimas 12 semanas e os últimos 12 meses.

### Quem precisa de contato

Na lista das assistências, vêm primeiro as que não abriram nenhuma ordem 3 dias depois do cadastro
e, em seguida, as que estão há 14 dias sem ordem nova. As duas regras usam só as ordens, porque abrir
ordem é o uso que importa: entrar e não abrir nada não conta como usar. Um botão abre o WhatsApp do
dono com uma mensagem que já diz por que o Henrique está chamando.

### Último acesso

O usuário ganhou o campo `ultimo_acesso`. A autenticação da API passou a ser
`TokenQueRegistraAcesso`, que grava o horário do pedido no máximo uma vez a cada 15 minutos por
pessoa, para não escrever no banco a cada clique.

O `last_login` do Django ficou de fora por dois motivos. O login acontece raramente, porque o token
não expira (ADR 0007). E o link de recuperação de senha do Django é assinado com o `last_login`:
atualizá-lo a cada acesso invalidaria links ainda válidos.

### Taxa do Asaas

A fatura ganhou o campo `valor_liquido`, lido do `netValue` que o Asaas manda em cada cobrança, tanto
no aviso quanto na consulta de hora em hora. A taxa é a diferença entre o valor e o valor líquido, e
só entra na conta das faturas pagas. Fatura paga sem valor líquido conta como sem taxa, em vez de
uma taxa inventada.

### Custos

O custo tem mês, descrição, valor e quem lançou. O valor precisa ser positivo, e o mês não pode
estar no futuro. Custo não é editado: lançado errado, ele é removido e lançado de novo, como os
pagamentos (ADR 0021).

### Aviso de cadastro

Quando uma assistência se cadastra pela tela de cadastro, uma tarefa manda um e-mail para cada conta
da plataforma, com o contato do dono, o fim do teste, um link para o WhatsApp dele com uma mensagem
de boas-vindas e o endereço do painel. Assistências criadas pelo painel administrativo ou pelos
dados de exemplo não geram aviso.

### Os gráficos

Os dois gráficos de evolução são colunas de uma cor só, no cinza das outras barras do sistema
(ADR 0021). A coluna mais alta e a última trazem o valor escrito quando há espaço para os dois, o
mouse mostra o valor de qualquer coluna, e "Ver os números" abre a tabela com todos. O cinza das barras tem contraste de 2,56:1
contra o fundo claro, abaixo dos 3:1 recomendados para gráficos. Os valores escritos e a tabela
compensam isso aqui, e o contraste das barras fica para a revisão de design da Fase 4G.

## Consequências

A situação de cada assinatura pode ficar algumas horas atrasada: um teste que termina à meia-noite
aparece como "Em teste" até a revisão das 7h.

A receita recorrente não tem histórico. O painel mostra a de agora; para ver a evolução, há o
recebido mês a mês.

O último acesso começa vazio para todo mundo. Até a pessoa usar o sistema depois desta fase, a lista
mostra "nenhum acesso registrado".

A lista das assistências não tem paginação, e o painel faz cerca de vinte consultas por acesso.
Para dezenas ou poucas centenas de assistências, isso é rápido; quando passar disso, a lista ganha
paginação.

Cada vez que o painel é aberto, a auditoria ganha um registro.

`make semear-plataforma` cria dez assistências fictícias com assinaturas inventadas. A consulta de
hora em hora ao Asaas não encontra essas assinaturas e registra um aviso no log do worker para cada
assinatura inventada, só no ambiente local.

## Alternativas consideradas

Marcar a conta de dono de uma assistência como plataforma daria menos trabalho, mas misturaria na
mesma sessão os dados de uma loja e os números de todas, e a auditoria de uma ação ficaria ambígua.

Usar `is_staff` ou `is_superuser` como marca da plataforma amarraria o painel ao acesso à
administração do Django. Com um campo próprio, as duas permissões ficam independentes.

Um papel de banco com `BYPASSRLS` só para o painel seria uma barreira ainda mais forte, mas exigiria
uma segunda conexão e mais um papel mantido fora das migrações. Com uma conta da plataforma só, a
variável vazia, feita de forma explícita, com teste e auditoria, é suficiente.

Uma tabela de auditoria separada para a plataforma deixaria a do ADR 0013 intocada, ao custo de dois
lugares para procurar quem fez o quê.

Lançar os custos pela administração do Django sairia quase de graça, mas o Henrique escolheu o
próprio painel, onde está o lucro que eles alimentam.

Uma biblioteca de gráficos, como Recharts, traria mais tipos de gráfico, mas seria uma dependência
nova para duas colunas simples. As colunas são HTML e CSS, sem JavaScript no navegador.
