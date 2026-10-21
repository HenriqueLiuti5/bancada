# 0036 — Estoque de peças e venda no balcão

## Contexto

O Bancada só tinha o orçamento digitado à mão. Ele não sabia quantas peças a loja tinha, quanto elas
custavam nem quanto sobrava de cada conserto, e as capas, películas e carregadores vendidos no
balcão ficavam fora do sistema.

Em outubro de 2026, os concorrentes que cobram menos já tinham estoque. O TecnoCel (R$ 49,90 a
R$ 59,90 por mês) tem venda no balcão com baixa automática e lucro por ordem. O GestãoClick (a
partir de R$ 89,90) tem estoque mínimo, compras com fornecedor, baixa da peça da ordem numa etapa
escolhida, lucro com a peça a preço de custo, saldo por loja e aviso de estoque baixo. O Siscoban
(grátis até 100 produtos) vende pelo código de barras, baixa a peça da ordem e tem relatório de
reposição.

No começo da fase, em 20 de outubro de 2026, o Henrique decidiu: a venda simples no balcão entra
agora; cada loja tem o seu estoque; a peça do orçamento sai na aprovação; e toda a equipe cadastra
produtos, lança compras e corrige a contagem, vendo custo e lucro.

## Decisão

**O estoque é a soma dos movimentos.** Cada entrada de compra, peça usada numa ordem, venda, venda
desfeita, correção de contagem e transferência é um movimento, com a quantidade que entrou ou saiu,
a loja, quem fez e quando (`MovimentoDeEstoque`). A quantidade de um produto é a soma dos seus
movimentos, numa loja ou em todas. Não existe um campo de quantidade que possa ficar diferente do
histórico, e a tela do produto mostra cada movimento, com o link da ordem ou da venda que o causou.
As operações que leem a quantidade antes de gravar travam o produto, e as que mexem em vários
produtos os travam pela ordem do id, para duas vendas não ficarem esperando uma pela outra.

**O produto.** Nome, tipo (peça para conserto ou acessório para vender), código, custo, preço de
venda, estoque mínimo e ativo. O código é opcional e não se repete na assistência; serve para a
busca e para o leitor de código de barras, que digita como um teclado. Produto não se apaga: o
desativado some do orçamento e da venda, e o histórico fica.

**Custo médio.** A entrada de compra registra a quantidade, o custo de cada unidade e o fornecedor,
em texto, com os já usados sugeridos no campo. O custo do produto passa a ser a média ponderada do
que havia com o que chegou. Com o estoque zerado ou negativo, ele passa a ser o custo da compra,
porque as peças que chegam cobrem o que já foi prometido às ordens. O custo também se corrige à mão
nos dados do produto.

**Um estoque por loja.** Cada movimento tem a sua loja. A peça de uma ordem sai da loja da ordem e a
venda sai da loja escolhida. A entrada e a contagem pedem a loja quando há mais de uma ativa, e a
transferência leva de uma loja para outra sem tirar mais do que a de origem tem. Com uma loja só,
nada disso aparece. O mínimo vale para o total da assistência: um produto que uma das lojas não
guarda não pede reposição só por estar zerado nela.

**A peça sai na aprovação.** O item do orçamento pode vir do estoque. A peça escolhida entra com o
nome e o preço de venda do produto, que a equipe pode mudar, e com uma unidade. Quando o cliente
aprova, cada peça aprovada tira uma unidade da loja da ordem, na mesma transação da mudança de etapa,
por um sinal de `EventoOS` em `estoque/sinais.py`. Uma ordem aprovada só segue para o reparo e a
entrega, então a peça não volta. Se ela não está na prateleira, o estoque fica negativo, a tela
mostra "Faltam 1" e o produto entra em Para repor. Peças recusadas, serviços e itens digitados não
mexem no estoque.

A mudança de etapa passou a travar a ordem e ler a etapa gravada, não a que estava na memória. Antes,
dois pedidos ao mesmo tempo podiam aprovar ou entregar a mesma ordem duas vezes; agora o segundo
recebe a recusa de etapa inválida. Isso protege a peça tirada do estoque e os pagamentos da entrega.

**O lucro da ordem.** É o valor cobrado menos o custo dos itens que contam. Antes da entrega, no
lugar do cobrado entra o total aprovado, ou o total do orçamento antes da aprovação. A peça do
estoque usa o custo atual do produto até a entrega, quando esse custo fica guardado no item, e as
compras seguintes não mudam o lucro de uma ordem entregue. No item digitado à mão, a equipe pode
informar o custo, como o da tela comprada na hora para aquele conserto. A aba Orçamento mostra o
custo das peças e o lucro, "Lucro previsto" antes da entrega, quando algum item tem custo; sem
nenhum, o bloco só repetiria o total. As peças digitadas sem custo são contadas à parte, com o aviso
de que o lucro real é menor. Custo e lucro nunca aparecem para o cliente, nem na página dele nem nos
PDFs.

**A venda no balcão.** Cada venda tem um número próprio na assistência, a loja, os produtos com a
quantidade, o valor cobrado, que pode ser menor que o total para dar desconto, e as formas de
pagamento, divididas como na entrega, que somam exatamente o valor cobrado. Cada item guarda o nome,
o preço e o custo do produto no momento, e a tela da venda mostra o custo e o lucro. Os produtos
saem da loja na hora. Vender o que o sistema diz que acabou é aceito, porque quem manda é a
prateleira, e o estoque fica negativo. Só o dono desfaz uma venda, como só ele remove um pagamento
(ADR 0021): os produtos voltam ao estoque, o valor sai do painel, a venda continua na lista como
desfeita e entra na auditoria com a ação nova `venda_desfeita`.

**Quem faz o quê.** Toda a equipe cadastra produtos, lança entradas, corrige a contagem, transfere,
vende e vê custo e lucro. Os valores em dinheiro do painel continuam só para o dono (ADR 0021), e o
modo só de consulta (ADR 0022) recusa tudo o que grava.

**O painel.** O recebido do período soma os pagamentos das ordens e os das vendas no balcão, e a
divisão por forma de pagamento também. As vendas aparecem à parte em "Vendas no balcão", com a
quantidade no período, e as desfeitas não contam. Em Agora, o indicador Para repor mostra a toda a
equipe quantos produtos ativos estão abaixo do mínimo, somando as lojas, e leva à lista filtrada.

**As telas.** O menu ganhou Estoque e vendas, entre Ordens e Equipe, para toda a equipe; no celular,
a barra de baixo do dono passa a ter seis itens. A tela tem duas abas. Em Produtos ficam a busca por
nome ou código, a situação (ativos, para repor, desativados) e o tipo. Em Vendas no balcão fica a
lista das vendas. A tela do produto mostra a quantidade, separada por loja quando há mais de uma, a
entrada de compra, a correção da contagem e a transferência, estas duas recolhidas, as
movimentações e os dados do produto. A nova venda mostra quanto cada produto tem na loja escolhida,
e a primeira forma de pagamento acompanha o valor cobrado até alguém mexer nela. Um tour novo
apresenta a tela (ADR 0020).

**O isolamento.** As cinco tabelas novas têm a assistência em cada linha e a trava do banco (ADR
0009), como as outras.

## Consequências

A API ganhou 51 testes em `estoque/tests/`. Eles cobrem o cadastro e o código, o custo médio, a
entrada, a contagem, a transferência, a baixa na aprovação e a segunda aprovação recusada, o lucro
antes e depois da entrega, as vendas e o desfazer, o painel, o isolamento entre assistências e a
trava do banco.

No site, as contas de quantidade e de total da venda têm testes de unidade, e um teste de contrato
confere que os tours do site são os que a API aceita marcar como vistos. O teste de navegador novo,
`e2e/estoque.spec.ts`, cadastra uma peça e um acessório, registra uma compra, usa a peça num
orçamento aprovado, vende acessórios e confere o que precisa repor na tela do produto e no painel, no
computador e no celular.

Cada execução completa dos testes de navegador cria agora dez assistências, cinco por tamanho de
tela, exatamente o limite de 10 cadastros por hora (ADR 0033). Na CI, a API do job de produção sobe
com `THROTTLE_CADASTRO=30/hour`, para que uma nova tentativa de um teste não esbarre no limite. Na
máquina, `THROTTLE_CADASTRO=100/hour` no `.env` continua subindo o limite.

Como os pagamentos de uma venda somam exatamente o valor cobrado, o fiado no balcão fica para o
financeiro (4Q).

Ficaram de fora os aparelhos à venda controlados pelo IMEI, como no TecnoCel; a importação da nota
do fornecedor em XML e a emissão de nota fiscal, que a 4Q decide; o recibo da venda em PDF; o aviso
de estoque baixo por e-mail; a contagem de todo o estoque de uma vez; e os relatórios de produtos
mais vendidos. Os produtos de exemplo do `semear` entram na 4R, junto com as telas novas da página
inicial.

## Alternativas consideradas

**A quantidade num campo do produto.** Seria mais simples de ler, mas cada operação precisaria
manter o campo e o histórico iguais, e um erro deixaria os dois diferentes. A soma dos movimentos é
uma só fonte, e com o índice por produto e loja a consulta continua rápida.

**Tirar a peça ao começar o reparo ou na entrega.** Na entrega, o estoque mostraria como disponíveis
peças já presas em consertos, e a mesma peça poderia ser prometida duas vezes. Ao começar o reparo, a
loja só descobriria a falta depois da aprovação. Na aprovação, o cliente já disse sim, e a falta
aparece na hora em Para repor.

**Um estoque só para a assistência.** Seria mais simples, mas uma rede veria a soma das lojas sem
saber onde está cada peça. Com uma loja só, a divisão nem aparece.

**Só o dono mexer no estoque.** Era a recomendação, porque o custo ficaria com quem vê o dinheiro no
painel. O Henrique preferiu que toda a equipe cuide do estoque, porque quem recebe as peças e vende
no balcão costuma ser o atendente.

**O custo da última compra.** É mais fácil de explicar, mas uma compra mais cara faria o lucro das
peças que já estavam na prateleira parecer menor. A média ponderada acompanha o que a loja pagou de
fato.

**O mínimo em cada loja.** Uma loja que só vende acessórios pediria reposição de toda peça de
conserto. O mínimo no total da assistência, com a quantidade de cada loja na tela, avisa sem ruído.
