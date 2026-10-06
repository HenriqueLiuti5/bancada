# 0025 — Logo da assistência

## Contexto

A ordem de serviço chega ao cliente final por quatro caminhos: o e-mail automático de cada etapa
(ADR 0011), o link que a loja manda pelo WhatsApp, a página de acompanhamento que esse link abre
(ADR 0008) e os papéis em PDF, o comprovante de entrada e o recibo de entrega (ADR 0012). Em todos
eles a assistência aparecia só pelo nome, em texto. O Bancada não guardava nenhuma imagem dela.

O pedido foi que a assistência possa colocar a logo da empresa, para que a logo e o nome da loja
apareçam quando a ordem chegar ao cliente. É o que faz o link parecer da loja onde ele deixou o
celular, e não de um sistema que ele não conhece. Um link com cara estranha é um link que o cliente
não abre.

## Decisão

**Envio.** A logo é enviada na tela Assistência, num cartão próprio, logo abaixo dos dados da
assistência. Valem as regras desses dados: só o dono troca ou remove, nada muda enquanto a
assinatura está no modo só de consulta (ADR 0022), e cada troca ou remoção fica na auditoria. O
cartão mostra uma prévia do cabeçalho como o cliente vai ver, com a logo atual ou com a que acabou
de ser escolhida.

**Tratamento.** A API aceita PNG, JPEG e WebP de até 10 MB, os mesmos formatos e o mesmo limite das
fotos (ADR 0010), e regrava toda logo como PNG com transparência, já na posição certa e com no
máximo 512 pixels no lado maior. Isso descarta os metadados da imagem original e deixa o arquivo
pequeno para ir dentro do e-mail e do PDF, sem perder nitidez nos tamanhos em que a logo aparece.
A largura e a altura ficam gravadas junto, e é delas que cada lugar calcula o tamanho da logo.

**Armazenamento.** O arquivo fica no mesmo armazenamento privado das fotos, em
`logos/<assistência>/<nome aleatório>.png`, ligado ao `Tenant`. Trocar ou remover apaga o arquivo
anterior, mas só depois que o banco confirma a gravação; se a transação for desfeita, o arquivo
antigo continua lá.

**Entrega.** Como as fotos, a logo não tem endereço fixo. Ela sai por um link assinado que vale 15
minutos: `/logos/<assinatura>` no Next, que repassa para `/api/logos/arquivo/<assinatura>/` no
Django. O link não pede login, porque quem abre a página de acompanhamento é o cliente, e tem limite
próprio de 240 pedidos por minuto.

**Onde aparece.**

- **Página de acompanhamento:** a logo fica no topo, acima do nome da assistência. Sem logo, fica o
  ícone de loja que já existia.
- **Prévia do link no WhatsApp:** a página informa nas etiquetas Open Graph o nome da assistência
  como título e a logo como imagem. É com elas que o WhatsApp monta a prévia quando o link é
  enviado.
- **E-mail:** o aviso ganhou uma versão em HTML, com a logo no topo, em até 200 × 48 pixels, o botão
  "Acompanhar o reparo" e os dados da ordem. A logo vai dentro do próprio e-mail, como imagem
  embutida (`cid:`), e não como link para o site. A versão em texto puro continua junto, para os
  programas que não mostram HTML.
- **Comprovante e recibo:** a logo entra no cabeçalho, à esquerda do nome, em até 42 mm de largura e
  16 mm de altura, embutida no PDF como as fotos.

**Nome da loja.** Na página de acompanhamento, na prévia do WhatsApp e no e-mail, o nome da
assistência vem seguido do nome da loja da ordem, como em "Assistência Central · Filial Centro", mas
só quando a assistência tem mais de uma loja. Com uma loja só, o nome dela costuma ser "Matriz", que
não diz nada ao cliente. Os PDFs já traziam a loja, com endereço e telefone, na linha de baixo do
cabeçalho, e continuam assim.

**Modo escuro.** Muita logo é escura sobre fundo transparente e sumiria no cinza do modo escuro.
Nesse modo, a logo aparece sobre um quadro branco de cantos arredondados. O tema vem de uma escolha
feita no menu da conta, então o cliente final vê sempre a página clara, com a logo sem quadro.

## Consequências

Cada e-mail de aviso fica maior pelo tamanho da logo, em geral algumas dezenas de KB. No e-mail de
entrega ela viaja duas vezes, no corpo e no recibo anexado.

A prévia do WhatsApp só funciona com o site num endereço público: o WhatsApp precisa baixar a página
e a imagem, e não alcança o `localhost`. Até a publicação (4F), dá para conferir as etiquetas no
código da página, mas não a prévia. O endereço da imagem é absoluto e sai de `APP_PUBLIC_URL`, que
precisa estar certo em produção. Os 15 minutos de validade bastam, porque o link da imagem é gerado
na hora em que a página é pedida e o WhatsApp baixa a imagem logo em seguida e guarda a própria
cópia.

Como a rota das fotos, a da logo passa pelo Next sem repassar o endereço de quem pede, então o
limite de 240 por minuto conta todos os visitantes como um só. A correção está na lista da 4F.

O backup dos arquivos, também da 4F, precisa levar a pasta `logos` junto com a das fotos.

O painel administrativo do Django mostra a logo, mas não deixa trocá-la: a troca tem de passar pelo
tratamento e pela auditoria.

Um detalhe do Django 5.2 custou um defeito durante a fase: a largura e a altura só são calculadas
quando o arquivo gravado tem nome, e sem elas o e-mail e os PDFs saíam sem a logo. A logo tratada
nasce com nome, e um teste confere a largura e a altura direto no banco.

## Alternativas consideradas

**Endereço público e fixo para a logo.** Seria mais simples: o e-mail apontaria para uma imagem no
site. Foi descartado por dois motivos. Muitos programas de e-mail bloqueiam imagens externas até a
pessoa liberar, e a logo é justamente o que faz o e-mail parecer da loja. E iria contra a regra da
ADR 0010, de que nada enviado pela assistência fica num endereço público permanente.

**Aceitar SVG.** Uma logo vetorial fica nítida em qualquer tamanho, mas SVG é um documento que pode
carregar script e buscar arquivos de fora, e limpar isso com segurança é um trabalho à parte. Um PNG
de 512 pixels já é nítido nos tamanhos usados.

**Uma logo por loja.** O pedido foi a logo da empresa, e as filiais já se distinguem pelo nome da
loja ao lado. Se alguma rede precisar de uma logo por filial, o campo passa do `Tenant` para a
`Loja`.

**Logo também na barra lateral do sistema.** Não foi pedido, e a barra lateral é o lugar da marca do
Bancada.

**Mostrar sempre o nome da loja.** Descartado pelo motivo acima: "Matriz" não acrescenta nada para
quem tem uma loja só.
