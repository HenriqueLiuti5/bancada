# 0038 — Página inicial com telas novas

## Contexto

A página inicial mostra telas reais do sistema, capturadas sobre os dados de exemplo (ADR 0026): a
lista de ordens e a parte de dinheiro do painel, além da página do cliente. Da 4N à 4Q as telas
mudaram. O menu ganhou Estoque e vendas e Financeiro, e o painel ganhou Para repor, A pagar logo,
Caixa e o lucro mês a mês. As capturas ficaram velhas, e o Next as serve com a qualidade padrão, 75,
que borra as letras pequenas.

Os dados de exemplo também ficaram para trás. O `semear_movimento` criava dois meses de ordens com
peças digitadas sem custo e nenhum produto, venda, conta ou conferência do caixa; a 4P e a 4Q
deixaram esses exemplos para esta fase (ADR 0036 e ADR 0037). Com eles, o painel de exemplo mostrava
o lucro igual ao recebido, com o aviso das peças sem custo, e as telas do estoque e do financeiro
nasciam vazias.

No começo da fase, em 26 de outubro de 2026, o Henrique decidiu:

- A fase é feita em três partes, uma de cada vez: os dados de exemplo; o celular e o notebook
  desenhados em volta das telas, com as imagens mais nítidas; as telas novas na página inicial, com o
  estoque e o financeiro entre os recursos.
- A página segue sem fotos por enquanto. As fotos em PNG que ele escolher entram depois.

## Decisão

### Parte 1: seis meses de movimento de exemplo

**Seis meses, na ordem do tempo.** O `semear_movimento` conta a história da Assistência Central
desde duas semanas antes do primeiro mês do gráfico do lucro até agora. Uma agenda roda cada
acontecimento na ordem em que ele aconteceu, e cada um passa pelas mesmas funções que as telas usam:
abrir a ordem, mudar a etapa, receber o que faltava, registrar e desfazer a venda, comprar,
transferir e corrigir o estoque, lançar e pagar a conta, criar as contas fixas do mês e conferir o
caixa. Essas funções carimbam a hora de agora, e o exemplo leva cada registro para a hora em que ele
aconteceu. Assim a peça sai do estoque na aprovação, o custo médio muda com as compras, o custo fica
guardado na entrega, e cada conferência encontra na gaveta o que o sistema calcula, com as mesmas
regras de uma loja de verdade. O que cairia depois de agora não acontece: a ordem fica na etapa em
que estava, e a conta, sem pagar.

**O horário da loja.** As duas lojas abrem de segunda a sábado, das 9h às 18h, e no sábado só de
manhã. O tempo entre uma etapa e outra conta só as horas com a loja aberta, então os registros se
espalham pelo dia, e nada acontece no domingo além das contas fixas que a tarefa diária cria de
madrugada.

**O estoque.** São 34 produtos com código: telas, baterias e conectores dos oito aparelhos mais
comuns e acessórios para o balcão, cada um com o que cada loja costuma guardar e o mínimo das duas
somadas. A peça do orçamento vem do estoque e sai na aprovação. Quando falta, ela vem da outra loja,
se lá sobra, ou chega na manhã seguinte, comprada na hora, e a ordem passa por Aguardando peça. Uma
vez por semana, a loja compra o que ficou abaixo do mínimo, à vista ou em boleto para 14 dias, e a
compra entra como conta em Compras de peças e acessórios, que o lucro não desconta. O dia da compra
da semana fica três dias antes do dia da semana em que o comando roda, para Para repor mostrar o que
acabou desde a última compra, qualquer que seja esse dia. As peças que a loja não guarda, como
alto-falante, lente e flex, entram no orçamento digitadas com o custo.

**O balcão.** As vendas levam um a três acessórios, algumas com desconto e pagamento dividido, e
umas poucas são desfeitas pelo dono. Uma película às vezes quebra na aplicação, e a contagem é
corrigida.

**As contas.** Aluguel das duas lojas, salários, contador e internet se repetem todo mês. Luz, água,
o Simples Nacional e a taxa das maquininhas chegam a cada mês com um valor diferente; o imposto e a
taxa saem do que entrou no mês anterior. Motoboy e material de limpeza são pagos com o dinheiro da
gaveta. O dono paga de manhã o que vence no dia, e uma conta lançada pela equipe fica vencida há
três dias, para a tela e o painel mostrarem o aviso. No terceiro mês do gráfico, a loja compra
ferramentas novas, e o mês fica no prejuízo.

**O caixa.** Quase todo dia, alguém conta a gaveta de cada loja no fim do expediente, sem ver quanto
devia ter. De vez em quando falta ou sobra um pouco; as contagens dos últimos dias batem, para o
painel de exemplo mostrar o caixa conferido. Quando a contagem passa de R$ 300, ficam R$ 200 de
troco e o resto vai para o cofre; quando o dinheiro junta no meio do dia, R$ 400 vão para o cofre; e
algumas semanas começam com troco trazido do banco.

**Os recebimentos.** Como antes, parte das entregas fica devendo tudo ou metade para um dia
combinado. A maioria paga perto do dia, alguns semanas depois, e poucos não pagam.

**Sorteio sem reposição.** Os defeitos, os aparelhos e o movimento de cada dia saem de baralhos:
cada carta sai uma vez antes de o baralho ser embaralhado de novo. Com o sorteio comum, um mês tinha
o dobro de trocas de tela do outro, e o lucro variava de R$ 0,8 mil a R$ 9,6 mil numa mesma
história. Com os baralhos, o comando rodado em cinco datas diferentes deu entre R$ 3,7 mil e R$ 9,2
mil de lucro nos meses comuns e prejuízo em todos os meses das ferramentas. A semente continua fixa.

**As ordens do `semear`.** As duas ordens que o `semear` cria entram no começo da história e seguem
dali como as outras, para a lista de ordens não começar por elas.

**Onde fica.** A história mora em `bancada/core/exemplo/`, com um módulo para cada parte da loja: a
agenda e o horário, o catálogo, a oficina, o estoque e o balcão, as contas e a gaveta. O comando só
confere o modo de desenvolvimento e se o movimento já existe e chama a simulação.

**Teste.** Uma história curta, de quatro semanas, confere que nada fica depois de agora nem cai num
domingo, que toda peça tem custo, que nenhum acessório fica negativo, que a última conferência de
cada loja bate e que só a conta esquecida está vencida. Outro confere que o comando não cria o
movimento duas vezes.

## Consequências

O comando leva cerca de 45 segundos e cria em torno de 500 ordens, 450 vendas, 300 contas e 300
conferências.

Num banco que já tem o movimento antigo, de dois meses, o comando não muda nada, como antes: o
movimento novo aparece num banco que ainda não tem nenhum.

A história termina agora, então os números mudam com o dia em que o comando roda; os baralhos mantêm
o desenho do gráfico e das telas.

Ficam para as partes 2 e 3 o celular e o notebook desenhados, a qualidade das imagens e as capturas
novas na página inicial.

## Alternativas consideradas

**Gravar cada registro direto no banco, já com a data.** Seria mais rápido, mas o estoque, o custo
médio, o que devia haver na gaveta e o que falta receber teriam de ser calculados à parte, e as telas
mostrariam números que o sistema não chegaria sozinho.

**Sorteio comum, como antes.** É mais simples, mas o gráfico de seis meses dependia da sorte do dia
em que o comando rodava, e um mês comum podia aparecer quase no zero.

**Dados fixos num arquivo.** As datas envelheceriam: o painel mostra o mês atual, e as contas
vencidas e o caixa de ontem precisam ser de ontem.
