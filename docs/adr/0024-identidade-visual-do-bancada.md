# 0024 — Identidade visual do Bancada

## Contexto

A Fase 4G é a revisão do design de todo o site antes da publicação. Durante a fase, duas propostas
foram feitas e descartadas pelo Henrique: uma paleta escura, em grafite e verde-água, e outra creme e
verde, com cara de papel e sem ícones de enfeite. O pedido final foi refazer tudo do zero com:

- branco como cor principal;
- botões verdes, bem arredondados;
- barra lateral de uma cor mais escura, que combine com o verde;
- ícones para representar cada coisa;
- nenhuma poluição visual, seguindo os padrões de UI/UX, num visual limpo e liso.

Na revisão dessa versão vieram cinco ajustes:

- barra lateral preta, no lugar do verde-floresta;
- modo escuro em cinza-escuro, com um verde que combine com ele;
- nenhum efeito de vidro fosco nem fundo escurecido atrás de nada;
- o tour piscava ao mudar de passo e devia ter uma animação limpa;
- a barra lateral deve poder se recolher e mostrar só os ícones.

Depois, ele não gostou dos selos de status nem do aviso da assinatura, os dois em caixinha colorida
com fundo claro e borda, e pediu que seguissem o que os sistemas grandes, referência em design,
usam. Em seguida, pediu o mesmo para os ícones: tirar o fundinho de cor clara de todos eles e trocar
o conjunto por um de cara mais profissional e limpa.

## Decisão

### Cores

| Cor | Onde aparece |
|---|---|
| branco `#FFFFFF` | cartões, campos, menus, telas de acesso |
| quase branco `#F6F6F6` | fundo das páginas, que separa os cartões sem precisar de linhas fortes |
| verde `#15803D` | botões, links, item escolhido, gráficos |
| verde escuro `#116A33` | botão ao passar o mouse |
| preto `#0A0A0A` | barra lateral, barra do topo no celular, painel da tela de login |
| verde-claro `#3FB950` | ícone do item ativo na barra lateral |

Os cinzas são neutros, sem puxar para nenhuma cor, para combinar com a lateral preta. O texto é
quase preto (`#171717`), com dois cinzas para o que é secundário. Os status têm seis grupos, cada um
com sua cor:

| Grupo | Status | Cor |
|---|---|---|
| Novo | recebido | azul |
| Em andamento | em diagnóstico, aprovado, em reparo | violeta |
| Esperando algo de fora | orçamento enviado, aguardando peça | âmbar |
| Pronto | pronto | verde |
| Encerrado | entregue, devolvido sem reparo | cinza |
| Recusado | reprovado | vermelho |

### Status

O status aparece como o ícone dele, na cor do grupo, seguido do nome em cinza, sem fundo, sem borda
e sem caixinha. É o padrão do GitHub, do Linear e dos consoles do Google Cloud e da AWS: a cor fica
num ponto só, a lista não vira um arco-íris de etiquetas e o status não se parece com os botões, que
também são arredondados. O ícone tem forma própria para cada status, então dá para diferenciar
"Pronto" de "Entregue" pela forma, não só pela cor.

É o mesmo componente na lista de ordens, ao lado do título da ordem, na página do cliente, nas
faturas, na equipe e no painel da plataforma, e é o mesmo jeito de mostrar status que as listas do
painel já usavam. A etiqueta "você", na equipe, deixou de ser verde e virou uma etiqueta cinza
discreta.

### Avisos

Os avisos que ficam no topo das telas, como o da assinatura e o de confirmar o e-mail, são cartões
brancos iguais aos outros, com:

- o ícone preenchido, sem fundo, na cor do aviso: verde para informação, âmbar para atenção e
  vermelho quando o sistema está só para consulta;
- um título curto em negrito, que diz o que aconteceu, e embaixo uma frase em cinza, que diz o que
  isso muda;
- o botão da ação à direita, ou embaixo do texto no celular.

O destaque vem da posição, do ícone colorido e do título, sem fundo colorido nem borda colorida.
Os textos foram divididos em título e descrição, sem mudar o que dizem.

### Modo escuro

O modo escuro é cinza-escuro neutro: o fundo das páginas é `#191919` e os cartões, um pouco mais
claros, `#212121`. A barra lateral continua preta, e fica mais escura que o resto da tela.

O verde muda de tom para combinar com o cinza: os botões ficam em `#1F7F37`, um verde mais fechado
e menos saturado que o do modo claro, e clareiam para `#238636` ao passar o mouse. Links, ícones,
foco e o item escolhido usam `#3FB950`, que aparece bem sobre o cinza sem o brilho de neon do verde
anterior.

Os dois fundos suaves que restaram, o realce do cliente ou aparelho escolhido na nova ordem e o do
botão de excluir ao passar o mouse, são a cor misturada ao cinza dos cartões. Assim eles ficam
acinzentados como o resto da tela, em vez de manchas de verde ou vinho.

### Sem vidro nem fundo escurecido

Nenhum elemento tem fundo transparente, desfoque ou véu escuro atrás. A barra de navegação do
celular, as etiquetas sobre as fotos e as faixas de total nos cartões têm cor sólida, e o tour não
escurece a tela. Profundidade vem só de sombra, e só no que flutua: menus, o balão do tour, as dicas.

### Contraste conferido por conta

Cada combinação de texto e fundo foi calculada com a fórmula da WCAG: texto com pelo menos 4,5:1;
borda dos campos, foco e barras dos gráficos com pelo menos 3:1. Nenhuma ficou abaixo.

| Combinação | Claro | Escuro |
|---|---|---|
| texto principal sobre o fundo | 16,6:1 | 15,0:1 |
| texto mais claro sobre os cartões | 5,7:1 | 5,7:1 |
| texto branco sobre o botão verde | 5,0:1 | 5,1:1 |
| link verde sobre os cartões | 5,0:1 | 6,3:1 |
| texto secundário da barra lateral | 7,8:1 | 7,8:1 |
| ícone de cada status sobre os cartões e o fundo | 4,9:1 ou mais | 7,3:1 ou mais |
| nome do status, em cinza, sobre os cartões e o fundo | 7,7:1 ou mais | 6,8:1 ou mais |
| ícone dos avisos sobre o cartão | 4,6:1 ou mais | 5,1:1 ou mais |
| ícone cinza sobre os cartões e o fundo | 5,2:1 ou mais | 5,0:1 ou mais |
| ícone verde do item ativo sobre a lateral | 5,9:1 | 5,9:1 |
| borda dos campos sobre os cartões | 3,5:1 | 3,7:1 |

O verde mais vivo (`#16A34A`) ficaria mais alegre nos botões, mas o texto branco sobre ele tem só
3,3:1. Ele ficou para as barras dos gráficos e o anel de foco, onde 3:1 basta.

### Formas e profundidade

- Botões em forma de pílula, totalmente arredondados. Campos com 12px de raio, cartões com 16px e o
  cartão do status, na página do cliente, com 24px.
- Sombras bem leves nos cartões; sombra mais marcada só no que flutua sobre a tela.
- No foco, o campo ganha borda verde e um anel verde suave em volta; botões e links ganham um
  contorno verde de 2px. Dentro da barra lateral o contorno é verde-claro, para aparecer sobre o
  preto.
- As mudanças de cor ao passar o mouse têm uma transição curta, de 150ms.

### Ícones

Os ícones são do Phosphor Icons, de licença MIT, com traço fino e pontas arredondadas, que combinam
com a fonte. Nenhum ícone tem fundo: nada de quadradinho ou círculo de cor clara atrás. É o jeito do
GitHub, do Linear e da Vercel, em que o ícone é um desenho simples ao lado do texto e a cor aparece só
quando significa alguma coisa:

- cinza (`--icone`, o mesmo cinza do texto secundário) para os ícones que só identificam a coisa,
  como os dos cartões, das seções do painel, dos indicadores, dos menus e dos estados vazios;
- a cor do grupo nos status, a cor do aviso nos avisos e vermelho no indicador que pede atenção,
  como as ordens atrasadas;
- verde no item ativo do menu, com o ícone preenchido no lugar do contorno, como no iPhone e no
  Android. Na barra de baixo do celular, a pílula verde-clara atrás do ícone ativo saiu.

Os ícones aparecem:

- em cada item do menu e da navegação do celular;
- em cada cartão, ao lado do título, e em cada seção do painel;
- em cada indicador do painel, acima do nome;
- em cada status: bandeja para recebido, estetoscópio para diagnóstico, polegar para aprovado, chave
  para reparo, avião de papel para orçamento enviado, caminhão para aguardando peça, ✓ para pronto,
  aperto de mão para entregue, seta de volta para devolvido e X para reprovado;
- em cada linha do resumo da ordem, em cada passo dos primeiros passos, em cada etapa da barra de
  andamento que o cliente vê e em cada papel da equipe;
- nos estados vazios, maiores e em traço mais leve, e nas confirmações, preenchidos na cor do
  resultado.

Na linha do tempo da ordem, cada etapa é um círculo branco com borda fina; a etapa atual tem a borda
e o ícone na cor do status. Na barra de andamento do cliente, as etapas feitas e a atual são círculos
verdes, a atual com um anel verde em volta, e as próximas são círculos brancos com borda. Nos
primeiros passos, o passo feito vira um ✓ verde preenchido. Os avatares com as iniciais ficaram
brancos com borda, sem o verde-claro.

Todos os ícones do sistema estão em `src/componentes/icones.tsx`, que também esconde cada um dos
leitores de tela, já que o ícone acompanha um texto que diz a mesma coisa. Os campos de formulário
continuam sem ícone: já têm rótulo, e um ícone em cada campo pesaria nas telas de cadastro.

### Tipografia

Plus Jakarta Sans, uma fonte de formas arredondadas que combina com os botões. Títulos em negrito,
com as letras um pouco mais juntas, e números em largura fixa para os valores alinharem nas colunas.
O endereço do link do cliente e a senha do aparelho usam a fonte monoespaçada do próprio sistema,
sem download.

Fica a regra `text-rendering: geometricPrecision` no corpo e nos campos. Sem ela, o Chrome no Linux
arredonda a largura de cada letra para o pixel inteiro nos textos pequenos, e o espaçamento entre as
letras fica irregular.

### Claro por padrão

O sistema abre sempre no modo claro, branco. O modo escuro e o automático, que acompanha o celular,
continuam como opção no menu da conta. A escolha fica no cookie `tema`, com o valor `escuro` ou
`automatico`; sem cookie, é claro. Antes, sem escolha, o sistema seguia o aparelho.

### Barra lateral recolhível

No computador, o botão ao lado da marca recolhe a barra lateral para 72px, só com os ícones. Ao
passar o mouse, ou chegar pelo teclado, num ícone, aparece ao lado uma dica preta com o nome do item.
Recolhida, a marca vira o botão de expandir: ao passar o mouse, o "B" dá lugar ao ícone de abrir o
painel. Os menus de ajuda e da conta passam a abrir para o lado.

Os ícones ficam exatamente no mesmo lugar nos dois estados. Ao recolher, só a largura anima, em
200ms, e os nomes somem aos poucos; ao expandir, os nomes voltam um instante depois. Para leitores
de tela, o nome de cada item continua lá, só invisível.

A escolha fica no cookie `lateral`, com o valor `recolhida`. O layout do sistema lê o cookie no
servidor, então a página já chega com a barra do tamanho certo, sem abrir e fechar ao carregar. No
celular a barra lateral não existe, e nada muda.

### Tour

O tour deixou de usar o driver.js e passou a ser um componente do próprio sistema. O driver.js
apaga o balão a cada passo, espera o destaque chegar ao próximo elemento e cria um balão novo, que
surge do transparente: é a piscada que aparecia ao mudar de passo, e isso não é configurável.

No componente novo, o balão é o mesmo do começo ao fim:

- ele desliza da posição do passo anterior para a do passo seguinte, e a altura acompanha o tamanho
  do texto novo;
- um contorno verde, sem véu escuro, desliza junto e envolve o elemento da vez, com o arredondado
  do próprio elemento;
- o texto novo entra deslizando de leve no sentido em que o tour anda, para a frente ou para trás;
- os pontinhos de progresso se esticam no passo atual e ficam verdes nos já vistos.

O movimento dura 560ms, numa curva que começa rápida e assenta devagar, parecida com a das gavetas
do iPhone. Se a pessoa pediu ao sistema para reduzir animações, o balão e o contorno pulam direto para
o lugar. No celular, o balão fica preso embaixo da tela, e só o contorno se move.

O balão vai embaixo do elemento quando cabe; senão em cima, ao lado ou, para elementos maiores que a
tela, flutuando no pé da tela. Ele acompanha o elemento quando a página rola. Como não há véu, o
resto da tela continua clicável; ver as regras do tour na ADR 0020.

### Estrutura

- No computador, a barra lateral preta com a marca, o botão verde "Nova ordem de serviço", o menu e,
  embaixo, a ajuda e a conta.
- No celular, uma barra preta no topo com a marca, "+ Nova", a ajuda e a conta, e a navegação numa
  barra branca embaixo da tela.
- No celular, campos com letra de 16px, o que evita o zoom automático do iPhone, e botões com 44px de
  altura, o tamanho mínimo de toque recomendado.
- Telas de acesso com o painel preto, a marca e três vantagens com ícones, ao lado do formulário em
  fundo branco.
- Página do cliente com o nome da loja, a barra de etapas com ícones, a previsão de entrega e o
  contato com a loja em destaque quando ele precisa responder ao orçamento ou retirar o aparelho.
- Marca: um "B" branco num quadrado verde arredondado, no sistema, no ícone da aba e no da tela
  inicial do celular.

## Consequências

O visual inteiro está em `src/app/globals.css`, em variáveis com um valor para o modo claro e outro
para o escuro. Trocar um tom é mudar uma linha em cada modo; trocar uma cor por outra exige refazer
a conta de contraste das combinações em que ela aparece.

A fonte tem 26,6 KB no subconjunto latino, e o sistema passou a baixar uma fonte só.

Quem não tinha escolhido aparência e usava o celular no modo escuro passa a ver o sistema claro.
Quem escolheu "Escuro" no menu continua no escuro.

Como o layout raiz lê o cookie do tema, todas as páginas são montadas a cada pedido, inclusive
cadastro, termos e privacidade.

O tour agora é código nosso, em `src/app/(app)/conducaoDoTour.tsx`: posicionar o balão, rolar até o
elemento e responder ao teclado passam a ser manutenção do projeto. Em troca, o sistema tem uma
dependência a menos e controle total da animação.

Para usar um ícone novo, ele entra primeiro em `src/componentes/icones.tsx`, com o nome que tem no
site do Phosphor. As telas importam dali, e não direto do pacote; assim todo ícone sai escondido dos
leitores de tela e trocar o conjunto inteiro no futuro é mexer num arquivo só. O pacote está na lista
`optimizePackageImports` do `next.config.ts`, para o servidor de desenvolvimento carregar só os
ícones usados, e não os 1.500 do pacote.

O tom de todos os ícones cinza é a variável `--icone`. Se um dia eles voltarem a ser verdes, é uma
linha em cada modo.

Os documentos em PDF continuam neutros, em preto e cinza, pensados para impressora de balcão; a
única cor neles é a da logo da assistência, quando ela tem uma (ADR 0025). O e-mail de aviso ganhou
uma versão em HTML no estilo do sistema, com cartão branco e botão verde em pílula, montada com
tabelas e estilos escritos em cada elemento, que é o que os programas de e-mail entendem.

No ambiente de desenvolvimento, o indicador redondo do Next fica sobre a aba "Assinatura" da barra
de baixo no celular. Ele não existe em produção.

## Alternativas consideradas

**Paleta escura, em grafite e verde-água.** Primeira proposta da fase, descartada pelo Henrique.

**Paleta creme e verde, com cara de papel e sem ícones de enfeite.** Segunda proposta, descartada:
o pedido final é um sistema branco, arredondado e com ícones.

**Barra lateral verde-floresta.** Foi a primeira versão desta proposta. O Henrique preferiu preta,
que deixa o verde só para o que é ação.

**Modo escuro quase preto, puxado para o verde.** Também da primeira versão. O cinza neutro é mais
confortável e combina com a lateral preta.

**Fundo das páginas em branco puro.** Cartões brancos sobre branco precisariam de bordas mais
fortes; o quase branco separa os cartões só com sombra leve.

**Selo de status em pílula, com fundo suave, borda fina e texto colorido.** Foi a primeira versão
desta proposta, e o Henrique não gostou. Em cada linha havia quatro elementos de cor (fundo, borda,
ícone e texto), e a pílula verde de "Pronto" lembrava os botões.

**Selo compacto com fundo suave e sem borda, como no Stripe e no Shopify.** É o outro padrão comum
nos sistemas grandes. Ficou de fora porque continua sendo uma caixinha colorida em cada linha, que é
o que o pedido descarta, e porque as listas do painel já mostravam o status como ícone e nome.

**Aviso em caixa com fundo amarelo e borda.** Também da primeira versão, descartado junto com os
selos, pelo mesmo motivo.

**Aviso numa faixa de largura inteira no topo da tela, como o GitHub faz com os avisos da conta.**
Mudaria o layout de todas as páginas. O cartão no topo do conteúdo tem o mesmo destaque e segue o
desenho dos outros cartões.

**Ícones em quadradinhos e círculos verde-claros.** Foi a versão anterior desta proposta. O
Henrique pediu para tirar o fundo de todos.

**Ícones verdes, só sem o fundo.** Manteria a cor da marca, mas espalharia verde por cada cartão,
seção e indicador. Nos sistemas de referência o ícone é neutro e a cor fica para o que significa
alguma coisa, então ele ficou cinza. A volta para o verde é uma linha em `globals.css`.

**Lucide com o traço mais fino.** Era o conjunto anterior, e afinar o traço deixaria tudo mais leve.
Mas é o conjunto padrão de quase todo sistema feito com shadcn/ui, e o pedido era trocar os ícones.

**Heroicons, da equipe do Tailwind.** É limpo e muito usado, mas tem cerca de 300 ícones e não tem
aperto de mão, ampulheta, coroa, fone de atendimento nem o logo do WhatsApp, que o sistema usa. O
Phosphor tem mais de 1.500, em seis pesos, incluindo o preenchido que marca o item ativo.

**Manter o driver.js, sem a animação dele.** Some o intervalo vazio, mas o balão continua sendo
trocado de uma vez a cada passo: em vez de piscar, ele salta, sem deslizar.

**Escurecer a tela durante o tour.** É o padrão das bibliotecas de tour, mas é exatamente o fundo
escurecido que o pedido descarta. O contorno verde basta para mostrar o elemento.

**Inter como fonte.** É a mais comum em sistemas limpos; a Plus Jakarta Sans foi escolhida pelas
formas arredondadas, que conversam com os botões em pílula.
