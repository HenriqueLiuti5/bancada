# 0037 — Financeiro da loja

## Contexto

O Bancada registrava o dinheiro que entra: os pagamentos das ordens na entrega e depois dela (ADR
0021) e as vendas no balcão (ADR 0036). Nada registrava o que sai. O dono não tinha onde lançar o
aluguel, a luz, os salários e as compras de peças, nem como saber o que vence nesta semana.

Em outubro de 2026, os concorrentes que cobram até R$ 60 por mês já tinham o financeiro. O FAST DESK
(R$ 59,90) tem contas a pagar e a receber, caixa e um plano de contas pronto, e só emite nota fiscal
no plano de várias lojas. O FixaOS tem fluxo de caixa, categorias, contas que se repetem, taxa do
cartão calculada e comissão de técnico. O GestãoClick abre e fecha o caixa do dia, mostra o saldo
previsto e repete as contas fixas sozinho. A Técnica Sistemas confere o dinheiro contado no
fechamento do caixa, com sangria e suprimento, e deixa o financeiro só para o dono e o gerente. O
TecnoCel mostra no painel as despesas pendentes, vencidas e pagas, tem crediário no plano de R$
59,90 e vende a nota fiscal à parte, por mais R$ 59,90 por mês.

No começo da fase, em 22 de outubro de 2026, o Henrique decidiu:

- A fase é feita em quatro partes, uma de cada vez: contas a pagar; contas a receber num lugar só;
  caixa do dia; lucro do mês no painel.
- Qualquer pessoa da equipe lança uma conta, mas só o dono vê a lista, os totais e o lucro.
- O caixa do dia mostra o resumo por forma de pagamento e confere o dinheiro da gaveta no fim do dia,
  com retiradas e reforços, sem ninguém precisar abrir o caixa para trabalhar.
- O fiado no balcão entra, com as contas a receber. Em 25 de outubro, o Henrique decidiu deixá-lo
  fora do sistema.
- Comissão dos técnicos, taxa da maquininha e nota fiscal ficam de fora.

## Decisão

### Parte 1: contas a pagar

**A conta.** Cada conta tem o que é, a categoria, o valor, o vencimento e, opcionais, para quem é
paga, a loja e uma observação (`ContaAPagar`). As categorias são uma lista fixa de treze, do aluguel
às tarifas do banco e da maquininha, como o plano de contas pronto dos concorrentes: escolher é mais
rápido que montar a lista, e o lucro da parte 4 agrupa as despesas por elas. Quando a assistência tem
mais de uma loja, a conta é de uma delas ou de toda a assistência, como o contador. A conta paga tem
a data e a forma do pagamento, que são as quatro da entrega mais o boleto.

**Quem faz o quê.** Toda a equipe lança a conta que chegou, inclusive já paga, como o motoboy pago com
o dinheiro da gaveta. Para quem não é dono, a tela Financeiro é só esse formulário. A lista, os
totais, a correção, o pagamento, o desfazer, a remoção e as contas que se repetem são do dono, e a
API recusa os outros papéis em cada uma dessas rotas, não só na tela, como no painel (ADR 0021).
Assim os salários não ficam à vista da equipe. A remoção fica na auditoria, com a ação nova
`conta_removida`, como a do pagamento (ADR 0021).

**O pagamento.** Pagar pede o valor, que já vem com o da conta e muda quando houve juros ou
desconto, a data, que não pode ser depois de hoje, e a forma. A conta travada no banco não é paga
duas vezes por dois cliques. O pagamento lançado errado se desfaz, e a conta volta a ficar a pagar.

**As contas que se repetem.** A conta lançada pelo dono com Repetir todo mês cria uma repetição
(`ContaFixa`), com os dados da conta e o dia do vencimento. A conta de cada mês aparece sozinha um mês
antes de vencer: na hora, quando o vencimento seguinte já cai nesse prazo, e depois por uma tarefa
diária, às 5h. A repetição guarda o vencimento da última conta criada, e a tarefa só cria as que vêm
depois dele: rodar duas vezes não duplica, e a conta removida não volta. A trava na repetição faz duas
execuções ao mesmo tempo esperarem uma pela outra. O mês que já tinha vencido quando a repetição foi
criada é pulado, para a conta não nascer atrasada. O dia 31 vence no último dia dos meses mais
curtos.

Na tela da conta, Mudar também as próximas leva o que foi corrigido para a repetição e para as contas
dela que ainda não foram pagas e vencem depois, com o dia novo em cada mês: é o aluguel que subiu.
Parar de repetir encerra a repetição e tira da lista as próximas sem pagamento; as pagas ficam.

**O aviso do que vence.** No alto da tela ficam o que venceu, o que vence nos próximos 7 dias e o que
foi pago no mês. No painel, a seção Dinheiro, que só o dono vê, ganhou A pagar logo: a soma do que
venceu com o que vence nos próximos 7 dias, em vermelho quando há conta vencida, com o link para a
lista. Com o painel filtrado por uma loja, entram só as contas dela; as de toda a assistência aparecem
no painel sem filtro.

**As compras de peças.** A categoria Compras de peças e acessórios é dinheiro que sai, mas não vai
contar como despesa no lucro da parte 4. O lucro já desconta o custo das peças usadas nas ordens e
vendidas no balcão (ADR 0036), e contar também a compra cobraria a mesma peça duas vezes.

**As telas.** O menu ganhou Financeiro, entre Estoque e vendas e Equipe, para toda a equipe. Para o
dono, a tela é Contas a pagar: os três números do alto, as abas A pagar, Vencidas e Pagas, a busca
pelo que é ou para quem e o filtro por categoria. Cada conta mostra o vencimento como o prazo das
ordens (ADR 0028): "Há 2 dias" em vermelho, "Hoje" em laranja e a data nos demais casos; a paga mostra
quando e como foi paga. A tela da conta tem o pagamento, a repetição, os dados para corrigir e a
remoção, cada ação que desfaz com uma segunda confirmação na própria tela. No celular, a barra de
baixo do dono teria sete itens; a Assinatura, aberta poucas vezes, passou para o menu da conta, no
alto da tela, e a barra continua com seis. Um tour novo apresenta a tela, com uma parada própria para
quem não é dono (ADR 0020).

**O isolamento.** As duas tabelas novas têm a assistência em cada linha e a trava do banco (ADR 0009).

### Parte 2: contas a receber

No começo da parte, em 25 de outubro de 2026, o Henrique decidiu que o dia combinado é obrigatório,
que qualquer pessoa da equipe o muda e que a ordem ganha um botão para cobrar o cliente pelo WhatsApp.

**O dia combinado.** Na entrega que deixa parte do valor para depois, quem entrega informa o dia em
que o cliente combinou pagar o resto, guardado na ordem (`pagamento_combinado_para`). A API recusa a
entrega sem ele e com um dia antes de hoje; quando nada fica a receber, o dia enviado não vale. É um
dia só por ordem, sem parcelas. O recibo mostra o que falta pagar e até quando.

**Mudar o dia.** O cliente que pede mais prazo ganha outro dia na tela da ordem, por qualquer pessoa
da equipe, que também registra o pagamento do resto (ADR 0021). Cada dia combinado fica no histórico
da ordem num registro novo, `pagamento_combinado`, com quem fez e quando: o da entrega diz quanto
falta e até quando, e cada mudança diz de qual dia para qual. O cliente não vê esses registros, como
os comentários (ADR 0034). Pedir o dia que já vale não registra nada. As ordens entregues antes desta
parte não têm dia e ganham o primeiro do mesmo jeito.

**Cobrar o cliente.** O cartão da ordem que ficou devendo diz até quando o cliente combinou pagar, em
vermelho quando o dia passou, e tem Cobrar no WhatsApp, com uma mensagem pronta que lembra o valor, o
aparelho e o dia. O botão fica na auditoria como os outros links mandados pelo WhatsApp.

**A tela.** O Financeiro do dono ganhou duas abas, Contas a pagar e Contas a receber. Contas a receber
segue a de pagar: no alto, o que venceu, o que vence nos próximos 7 dias e o que os clientes pagaram
neste mês depois da entrega; abaixo, as abas A receber, Vencidas e Recebidas e a busca pelo cliente,
pelo aparelho ou pelo número da OS. A lista começa pelo dia que vence primeiro, e as ordens sem dia
ficam por último. Recebidas são as ordens que o cliente terminou de pagar depois da entrega. Cada
linha leva à ordem, onde o pagamento é registrado. A API das contas a receber recusa técnico e
atendente, como a das contas a pagar; a equipe continua com a aba A receber da lista de ordens.

**O painel.** A receber fica em vermelho quando há pagamento vencido e leva às Contas a receber. A
regra do vencido está em `ordens.consultas.pagamento_vencido`, usada pelo painel e pela tela, para os
dois contarem o mesmo (ADR 0021).

**O que veio depois da entrega.** O pagamento registrado na entrega fica com a hora dela (ADR 0021),
então os que vêm depois são o cliente pagando o que ficou devendo. É essa a regra do recebido no mês e
das Recebidas.

### As próximas partes

A parte 3 mostra o caixa do dia e a conferência do dinheiro. A parte 4 leva o lucro do mês ao painel.
Cada uma acrescenta aqui o que decidiu.

## Consequências

A API ganhou 28 testes em `financeiro/tests/`. Eles cobrem quem lança e quem vê, as recusas com
mensagens simples, a loja, as abas e os filtros, o pagamento e o desfazer, a remoção na auditoria, os
números do alto e do painel, a repetição mês a mês e no dia 31, a tarefa diária em várias
assistências, mudar as próximas, parar de repetir, o isolamento entre assistências e a trava do
banco.

No site, o texto do vencimento e o aviso do painel têm testes de unidade, e um teste de contrato
confere que o site e a API têm as mesmas categorias e formas de pagamento. O teste de navegador novo,
`e2e/financeiro.spec.ts`, lança o aluguel que se repete, uma despesa já paga depois de uma recusa que
não perde o que foi enviado e a conta de luz, paga o aluguel vencido com juros, para a repetição e
confere o aviso do painel, no computador e no celular.

As caixas de marcar controladas apareciam desmarcadas depois de um envio recusado, enquanto o estado
continuava marcado e mostrava os campos que elas abrem. O `useMarcacaoPadrao` faz por elas o que o
`useOpcaoPadrao` já fazia pelos selects (ADR 0035).

Cada execução completa dos testes de navegador cria agora doze assistências, acima do limite de 10
cadastros por hora (ADR 0033). O `docker-compose.yml` de desenvolvimento sobe a API com
`THROTTLE_CADASTRO=100/hour`, a menos que o `.env` diga outro valor; a produção continua com 10, e a
CI, com 30, ainda tem folga para uma nova tentativa. O teste do limite de cadastros passou a fixar o
de produção, para valer em qualquer máquina.

A conta de cada mês depende do Celery Beat, que já roda as outras tarefas periódicas (ADR 0013). Com
ele parado por mais de um mês, o mês que passou não é criado depois, atrasado.

As contas de exemplo do `semear` entram na 4R, junto com as telas novas da página inicial.

Ficaram de fora, além do que o Henrique deixou para depois: o aviso por e-mail das contas que vencem,
anexar o boleto ou o comprovante, parcelar uma compra em várias contas, criar a conta a partir da
entrada de compra no estoque ou do XML da nota do fornecedor, a conciliação com o extrato do banco e
as categorias criadas pela assistência.

Na parte 2, a API ganhou 10 testes: o dia na entrega e as recusas, a entrega quitada, a mudança por
qualquer pessoa com o registro no histórico, o primeiro dia de uma entrega antiga, as recusas da
mudança, quem vê, a ordem e as abas da lista com a busca, o resumo sem o mês anterior, o isolamento e
o vencido no painel. Os testes que entregavam com valor faltando passaram a informar o dia. No site, a
situação do dia combinado, o texto do cartão, a mensagem do WhatsApp e o aviso do painel têm testes
de unidade, e o teste de contrato confere o tour novo, `a-receber`. O teste de navegador novo,
`e2e/contas-a-receber.spec.ts`, entrega uma ordem com parte para depois, confere a recusa sem o dia,
o cartão, a cobrança pelo WhatsApp, a mudança no histórico, a tela e o painel, e paga o resto, no
computador e no celular. Cada execução completa dos testes de navegador cria agora catorze
assistências, ainda abaixo das 30 por hora da CI.

No `semear_movimento`, uma parte das entregas fica devendo tudo ou metade, com o dia combinado, e boa
parte delas é paga perto do dia, para a tela não nascer vazia.

## Alternativas consideradas

**Só o dono lançar as contas.** Era a recomendação, pelos salários. O Henrique preferiu que a equipe
lance, porque quem recebe o boleto e paga o motoboy costuma ser o atendente, e que só o dono veja a
lista e os totais, o que também resolve os salários.

**Toda a equipe ver tudo, como no estoque.** O atendente veria o salário dos colegas e o lucro.

**Criar de uma vez as contas do ano.** O dono veria o ano inteiro, mas a repetição não teria fim, e o
aluguel que sobe precisaria ser corrigido conta por conta. Com a repetição guardada à parte, a mudança
vale para as próximas num lugar só.

**Criar a conta do mês seguinte quando a anterior for paga.** Um mês sem pagamento esconderia o
seguinte, justo quando o dono precisa ver que as contas se acumulam.

**Categorias que a assistência cria.** Ficam para quando alguém pedir. A lista fixa é mais rápida no
lançamento e mantém o lucro agrupado do mesmo jeito em todas as assistências.

**Gerar a conta a partir da entrada de compra do estoque.** O GestãoClick faz isso, mas a entrada é
lançada por toda a equipe (ADR 0036), e o formulário passaria a perguntar o prazo e a forma de
pagamento a quem só recebeu a caixa de peças.

**Dia combinado opcional.** Seria mais rápido no balcão, mas a ordem sem dia nunca vence, e o aviso do
que venceu sumiria justo para quem não combinou nada.

**Parcelas com vários dias.** É o crediário de alguns concorrentes. Fica de fora, na mesma linha do
fiado.

**Só o dono mudar o dia.** O cliente que pede mais prazo costuma falar com quem está no balcão, e o
registro no histórico mostra ao dono quem mudou.
