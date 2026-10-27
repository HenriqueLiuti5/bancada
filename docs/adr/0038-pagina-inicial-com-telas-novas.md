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

No começo da parte 3, em 27 de outubro de 2026, o Henrique pediu que a página mostre as telas que
mais atraem quem procura um sistema, como o dinheiro em verde do painel.

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

### Parte 2: celular e notebook desenhados

**O desenho.** O celular e o notebook são desenhados com CSS em volta das capturas, em
`app/(inicio)/molduras.tsx`, sem imagem e sem marca. O notebook tem a tampa preta com a câmera no
alto e a base mais larga que a tampa, com o encaixe para abrir no meio. O celular tem o aro, a câmera
num furo no alto da tela e os botões de volume e de ligar do lado direito, como a maioria dos
Android; nada de logo nem do recorte do iPhone. Um filete cinza contorna a tela do notebook: a barra
lateral do sistema é preta como a tampa, e sem ele a tela parecia começar mais para a direita.

**As proporções.** Cada aparelho é um contêiner (`@container`), e as medidas são em `cqw`, frações da
largura dele. O mesmo desenho serve a todos os tamanhos em que os aparelhos aparecem, do celular de
208 px ao notebook de 1024 px, sem uma medida para cada um. A tampa ocupa 86% da largura da base,
então a tela da lista de ordens, na abertura, passou de 1024 px para 846 px.

**As cores.** Os dois aparelhos são escuros, como a barra lateral do sistema. As cores entraram em
`globals.css` como `--aparelho` e as variações do aro, da lente, da base, da frente da base e do
encaixe. No modo escuro, o aro e a base clareiam, para o notebook não sumir no fundo cinza.

**O celular da abertura.** Continua de pé à frente do notebook, no canto direito. Ele avançava 48 px
além do notebook a partir de 1024 px de largura e, entre 1024 e 1119 px, ficava cortado na borda da
página. Agora avança 48 px a partir de 1280 px e 16 px abaixo disso.

**A qualidade.** O `next.config.ts` libera a qualidade 90 em `images.qualities`, além da 75 padrão,
e as molduras pedem a 90. A constante `QUALIDADE_DAS_CAPTURAS`, em `src/lib/capturas.ts`, é a mesma
nos dois lugares, porque no Next 16 uma qualidade fora da lista vira a mais próxima, 75, sem erro
nenhum. A escolha foi medida com o mesmo `sharp` que o Next usa: em WebP, a qualidade 90 tira as
manchas em volta das letras, com 1,5 dB a mais de PSNR que a 75; a 100 acrescentaria só 0,5 dB e
pesaria 55% a mais que a 90.

**Os tamanhos.** O `sizes` de cada imagem passou a ser a largura da tela dentro do aparelho, e não a
do aparelho inteiro, para o navegador não baixar uma imagem maior que a que mostra.

**Teste.** O teste de navegador das páginas públicas confere, no computador e no celular, que cada
tela da página inicial carrega e foi pedida na qualidade das capturas. Sem a qualidade liberada no
`next.config.ts`, ele falha.

### Parte 3: telas novas na página inicial

**O que a página mostra.** A abertura troca a lista de ordens pelo painel, rolado até a seção
Dinheiro: o recebido, as formas de pagamento, o lucro depois das peças e das contas e o lucro mês a
mês, com a barra lateral do sistema. O celular ao lado continua com a página do cliente. Nos
recursos, Estoque e vendas no balcão mostra a lista do estoque, com o aviso do que repor e, em cada
peça, a quantidade de cada loja, o custo e o preço em verde. Financeiro mostra as contas a pagar,
com o vencido, o que vence em 7 dias e o que foi pago no mês. Ele fica no lugar de Dinheiro e painel,
e o texto continua falando do pagamento na entrega e do painel. O preço passou a listar o estoque e o
financeiro entre o que vem incluso.

**Os tamanhos.** O painel é capturado com 1280 × 800: com menos largura, os valores grandes quebram a
linha. O estoque e as contas são capturados com 1152 × 720, porque nos recursos o notebook é menor, e
a tela mais estreita deixa as letras maiores. A página do cliente continua com 390 × 844, a partir do
topo dela, sem o da demonstração. Todas em densidade 2x.

**O período do painel.** A captura usa os últimos 30 dias, e não o mês, para não sair quase vazia
quando é refeita no começo do mês. O filtro do período fica acima da seção Dinheiro, fora da imagem.

**A imagem maior nos recursos.** Nos blocos com imagem, a imagem passou a ocupar 7 das 12 partes da
largura, e o texto, 5. No computador, a tela do notebook dos recursos passou de 424 px para cerca de
496 px de largura, e o notebook ficou da altura do texto ao lado.

**As capturas por um comando.** `make capturar-telas` refaz as cinco capturas e as grava em
`app/(inicio)/telas/`. Ele apaga e cria o banco `bancada_capturas` no Postgres de desenvolvimento e
sobe, pelo perfil `capturas` do Compose, uma API sobre esse banco e o site na imagem de produção, em
`localhost:3001`. A API roda o `semear`, o `semear_movimento` e o `preparar_capturas`, comando novo
que deixa o dono de exemplo com os tours vistos e os primeiros passos escondidos. O Playwright roda
`e2e/capturas.ts`, com a configuração `capturas.config.ts`, que não entra nos testes. No fim, o
comando derruba a API e o site e apaga o banco. O banco de desenvolvimento não muda.

**As tarefas.** A API das capturas manda as tarefas do Celery para outro banco do Redis, que o fim do
comando limpa. O worker de desenvolvimento procuraria cada evento no banco de desenvolvimento, onde o
mesmo número é de outra ordem.

**Os avisos.** Como na ADR 0026, nenhum aviso da assinatura aparece nas capturas: o banco novo começa
com 30 dias de teste, e a captura falha se o aviso aparecer. A assistência de exemplo não tem logo.

**Teste.** O teste do `preparar_capturas` confere que ele só mexe no dono de exemplo. O teste de
navegador das páginas públicas confere que a abertura mostra o painel no computador e que os recursos
mostram o estoque e o financeiro, no computador e no celular.

## Consequências

O comando leva cerca de 45 segundos e cria em torno de 500 ordens, 450 vendas, 300 contas e 300
conferências.

Num banco que já tem o movimento antigo, de dois meses, o comando não muda nada, como antes: o
movimento novo aparece num banco que ainda não tem nenhum.

A história termina agora, então os números mudam com o dia em que o comando roda; os baralhos mantêm
o desenho do gráfico e das telas.

Ficam para as partes 2 e 3 o celular e o notebook desenhados, a qualidade das imagens e as capturas
novas na página inicial.

Na parte 2, as imagens da página inicial ficaram cerca de metade mais pesadas: no computador com tela
de densidade 2x, passaram de 189 KB para 287 KB, e no celular, de 159 KB para 219 KB. As capturas
originais, em PNG, somam 754 KB.

Na densidade 1x, as letras da lista de ordens continuam pequenas: a captura tem 1280 px de largura e
aparece com 846 px na tela do notebook. Servir a imagem já na largura exata não deixou nada mais
nítido; ali falta tamanho de letra, não qualidade, o que é assunto das capturas novas da parte 3.

O painel de dinheiro, nos recursos, é um recorte do painel e aparece no notebook sem a barra
lateral, até a parte 3 trocar a captura.

Como antes, o celular também baixa a lista de ordens da abertura, que ele não mostra: o Next antecipa
a imagem para qualquer tamanho de tela.

Na parte 3, a lista de ordens saiu da página. No celular, a abertura continua só com a página do
cliente, e o dinheiro em verde aparece nos recursos; o celular baixa o painel da abertura sem
mostrá-lo, como baixava a lista.

As imagens somam 341 KB no computador com tela de densidade 2x e 277 KB no celular, contra 287 KB e
219 KB na parte 2: são cinco telas, e não quatro. As capturas em PNG somam 1,1 MB.

O mês das ferramentas, o do prejuízo, aparece na abertura como a ponta de uma barra vermelha, abaixo
da linha do zero do gráfico.

As capturas mudam com o dia em que o comando roda, como o movimento de exemplo. Refazê-las leva
alguns minutos, a maior parte para montar a imagem do site e criar os seis meses de movimento, e
precisa do ambiente no ar (`make up`) e do Playwright instalado no computador.

## Alternativas consideradas

**Gravar cada registro direto no banco, já com a data.** Seria mais rápido, mas o estoque, o custo
médio, o que devia haver na gaveta e o que falta receber teriam de ser calculados à parte, e as telas
mostrariam números que o sistema não chegaria sozinho.

**Sorteio comum, como antes.** É mais simples, mas o gráfico de seis meses dependia da sorte do dia
em que o comando rodava, e um mês comum podia aparecer quase no zero.

**Dados fixos num arquivo.** As datas envelheceriam: o painel mostra o mês atual, e as contas
vencidas e o caixa de ontem precisam ser de ontem.

**Aparelhos em imagem, PNG ou SVG.** Teriam mais detalhe, mas cada um precisaria de um recorte na
medida de cada captura, e a imagem de um aparelho de verdade traria a marca dele. O desenho em CSS se
ajusta a qualquer captura e a qualquer tamanho.

**AVIF.** Ligar o AVIF em `images.formats` guardaria melhor a cor dos ícones finos, que o WebP guarda
com metade da resolução em qualquer qualidade, e as imagens ficariam menores que em WebP na qualidade
90. Mas vale para todas as imagens do site, inclusive as fotos das ordens e as logos, e o AVIF leva
mais tempo para ser codificado no servidor. A qualidade 90 resolve as letras, que eram o borrado da
página.

**As capturas em PNG, sem passar pelo otimizador.** Seriam perfeitas, mas a lista de ordens sozinha
tem 304 KB, e o celular baixaria a imagem inteira, de 2560 px de largura.

**Manter a lista de ordens na abertura.** Combina com o texto da abertura, que fala de abrir a ordem
e mandar o link, mas é a tela que menos chama a atenção. O painel mostra o que o dono quer ver: quanto
entrou e quanto sobrou.

**Mostrar a venda no balcão, com o lucro.** A tela de uma venda tem o lucro em verde, mas a lista do
estoque mostra mais do recurso: a quantidade em cada loja, o custo, o preço e o aviso do que repor.

**Capturar à mão, no banco de desenvolvimento.** Foi como a ADR 0026 fez. Cada um dos três
computadores tem o próprio banco, alguns com o movimento antigo, de dois meses, e esconder os avisos
à mão é fácil de esquecer. O comando dá as mesmas telas em qualquer computador.

**Outro projeto do Compose, com um Postgres só para as capturas.** Isolaria mais, mas duplicaria o
banco, o Redis e as portas. Um banco a mais no mesmo Postgres basta, e o papel `bancada_app`, que não
passa por cima da trava do banco, continua sendo o da API.

**O site de desenvolvimento.** Dispensaria montar a imagem, mas mostra o indicador do Next no canto
da tela e compila cada página na primeira visita.

**Pular o tour pela tela.** O tour abre sozinho na primeira visita a cada tela. Pular cada um pela
tela só funcionaria num banco recém-criado e faria a captura esperar o tour aparecer; o
`preparar_capturas` deixa o dono pronto antes.
