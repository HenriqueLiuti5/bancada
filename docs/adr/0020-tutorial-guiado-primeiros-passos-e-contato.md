# 0020 — Tutorial guiado, primeiros passos e contato

## Contexto

O Bancada é vendido à distância: a assistência recebe um link, se cadastra e testa sozinha. Até a
Fase 4A, quem entrava pela primeira vez caía numa lista de ordens vazia, sem nenhuma indicação do
que fazer, e não tinha a quem perguntar. O que um vendedor ensinaria no balcão precisa estar dentro
do próprio sistema.

## Decisão

### Tour por tela, com driver.js

No primeiro acesso a cada tela principal (lista de ordens, abertura de ordem, detalhe da ordem,
painel e equipe), um tour destaca as partes da tela uma de cada vez, com um balão que diz o que
cada uma faz. A última parada sugere o que fazer em seguida.

O tour é montado com o driver.js, uma biblioteca pequena, sem dependências e com licença MIT. Ele
cuida do que dá trabalho fazer à mão: escurecer o resto da tela, rolar até o elemento, posicionar
o balão sem sair da tela e responder ao teclado. O balão recebe as cores do sistema visual (ADR
0017), então funciona no modo claro e no escuro. No modo escuro o fundo escurece mais, porque a
tela já é escura e o destaque perdia contraste.

Os textos de cada tour ficam em `apps/web/src/app/(app)/roteiros.ts`. Cada parada aponta para um
elemento pela marca `data-tour`, e não por classe CSS ou posição na tela: uma mudança de estilo não
quebra o tour.

Ao começar, cada parada passa por dois filtros:

- **Papel.** Uma parada pode declarar para quais papéis vale. A da senha de desbloqueio só aparece
  para dono e técnico; a atendente, que não pode ver a senha, não ouve falar do botão.
- **Visibilidade.** A parada cujo elemento não existe ou está escondido é pulada. Isso resolve
  sozinho o celular, onde a barra lateral dá lugar a um cabeçalho, e as partes que dependem do
  estado da ordem, como o orçamento de uma ordem já encerrada.

Enquanto o tour roda, a tela não aceita cliques fora do balão. O tour termina com "Entendi", no ×
ou com Esc; clicar no fundo escuro não fecha nada, para ninguém perder o tour sem querer.

### O que já foi visto fica na conta

Os tours vistos ficam gravados no usuário, numa lista no banco, e não no navegador. Quem viu o tour
no computador da loja não o vê de novo no celular. Pular conta como ver: quem fechou o tour sabe
onde reabri-lo.

A gravação usa o `array_append` do PostgreSQL numa única instrução, só quando o tour ainda não está
na lista. Ler a lista, acrescentar e salvar em Python perderia um dos tours se duas abas
terminassem ao mesmo tempo.

### Menu de ajuda

Um botão "Ajuda", no pé da barra lateral e no cabeçalho do celular, abre três opções: ver de novo
o tour da tela atual, mostrar de novo os primeiros passos que o dono escondeu, e falar com a gente
pelo WhatsApp.

### Primeiros passos

O dono vê, na lista de ordens e no painel, uma lista com quatro passos:

| Passo | Quando conta como feito |
|---|---|
| Abrir a primeira ordem | A assistência tem alguma ordem |
| Mandar o link ao cliente | Alguém clicou em Copiar ou WhatsApp no link do cliente, ou um aviso por e-mail saiu |
| Completar o endereço da loja | Todas as lojas têm endereço |
| Convidar a equipe | Algum convite foi criado, ou a equipe já tem mais de uma pessoa |

Nenhum passo é marcado à mão. A API calcula a situação a cada consulta, a partir do que a
assistência de fato fez, e é isso que faz os itens "se marcarem sozinhos". Guardar um marcador por
passo exigiria lembrar de atualizá-lo em cada lugar que cumpre o passo, e mais cedo ou mais tarde
algum ficaria esquecido.

O compartilhamento do link é registrado na auditoria, como `link_compartilhado`, com quem
compartilhou e de qual ordem. Esse registro já tem valor por si: o link dá acesso aos dados do
cliente, e passa a ficar claro quem o mandou para fora. Contar só os avisos por e-mail não
funcionaria, porque boa parte dos clientes de assistência não informa e-mail, e o link segue pelo
WhatsApp.

O passo do endereço não estava no plano. Entrou porque uma assistência que se cadastrou sozinha
fica com o comprovante sem endereço até lembrar de preenchê-lo. O passo de assinar, previsto no
plano, entra junto com a Fase 4B.

A lista é só do dono, porque dois dos passos só ele pode cumprir. Ele pode escondê-la a qualquer
momento, e ela vira "Tudo pronto" quando os quatro passos estão feitos. Esconder vale para a conta
dele, não para a assistência.

### Fale com a gente

O número do WhatsApp de suporte vem da variável `WHATSAPP_DO_SUPORTE`, lida pelo servidor do Next.
Ele não fica no código porque o repositório é público. A mensagem já sai com o nome da pessoa e da
assistência. Sem a variável preenchida, a opção simplesmente não aparece no menu.

## Consequências

Os roteiros precisam acompanhar as telas. Se uma marca `data-tour` sumir numa mudança de tela, a
parada correspondente é pulada em silêncio, sem erro. A troca foi deliberada: um tour com uma
parada a menos é melhor que um tour que quebra.

Clicar em Copiar mostra a intenção de mandar o link, não a prova de que ele chegou. Para uma lista
de primeiros passos, isso basta.

O container do frontend guarda o `node_modules` num volume anônimo, e o Compose reaproveita esse
volume quando recria o container. Uma dependência nova, como o driver.js, entraria na imagem e não
apareceria no container. O `make up` passou a renovar os volumes anônimos a cada subida. O custo é
que o cache de compilação do Next também recomeça, e a primeira página demora um pouco mais.

A lista de primeiros passos faz até oito consultas pequenas cada vez que o dono abre a lista de ordens
ou o painel. Enquanto ela estiver aparecendo, a assistência está começando e tem poucos dados.

## Alternativas consideradas

Guardar os tours vistos no `localStorage` do navegador dispensaria a mudança no banco, mas o tour
se repetiria em cada aparelho e depois de cada limpeza do navegador, contrariando o plano.

Escrever o tour do zero daria controle total, mas posicionar o balão sem sair da tela, rolar até o
elemento e escurecer o resto em qualquer tamanho de tela é justamente a parte difícil. Outras
bibliotecas populares foram descartadas: o react-joyride, por ficar amarrado às versões do React; e
o Intro.js, pela licença AGPL, que exige licença paga para uso num produto comercial fechado.

Vídeos curtos no lugar do tour ficariam desatualizados a cada mudança de tela, e custam para gravar
de novo. O tour usa a própria tela, então não tem como mostrar uma versão velha.
