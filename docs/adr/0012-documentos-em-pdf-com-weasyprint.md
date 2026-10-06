# 0012 — Documentos em PDF com WeasyPrint

## Contexto

Balcão de assistência funciona com papel. Na entrada, o cliente assina um comprovante que
descreve o aparelho, o defeito relatado e autoriza abrir o aparelho para diagnóstico — é o
documento que resolve a discussão sobre o estado em que o celular chegou. Na entrega, ele recebe
um recibo com o que foi feito, quanto custou e até quando vale a garantia; é o papel que ele
guarda na gaveta e apresenta meses depois.

Nada disso existia: o sistema tinha os dados, mas não tinha como colocá-los numa folha A4.

## Decisão

Os documentos são gerados com WeasyPrint, que transforma HTML e CSS em PDF. O layout de cada um é
um template Django comum, com folha de estilo, unidades em milímetros e regras de `@page`.

São dois documentos, e ambos saem sob demanda por um endpoint da API, autenticado e restrito à
assistência dona da ordem:

- **Comprovante de entrada** — dados do cliente e do aparelho, defeito relatado, fotos da entrada,
  declarações que o cliente assina e as duas linhas de assinatura.
- **Recibo de entrega** — o que foi feito, peças e serviços com valores, histórico do reparo, texto
  de garantia e a linha onde o cliente declara ter recebido o aparelho.

Os dois trazem um QR Code que abre a página pública de acompanhamento. É o que fecha o ciclo
começado na Fase 1C: o cliente sai da loja com o papel na mão e o link no bolso, e aponta a câmera
em vez de digitar um endereço.

O recibo também vai anexado ao e-mail de entrega, gerado dentro da tarefa do Celery. É o lugar
certo para trabalho pesado, e dá ao cliente o comprovante da garantia mesmo que ele perca o papel.

Nenhum documento imprime a senha de desbloqueio do aparelho, e há teste que falha se isso mudar. O
IMEI, ao contrário, é impresso: ele identifica exatamente qual aparelho foi entregue e devolvido, e
é do próprio cliente que recebe o papel.

Os PDFs não são guardados. Cada pedido gera o documento a partir do estado atual da ordem.

## Custo dessa escolha

WeasyPrint precisa de bibliotecas de sistema — Pango, HarfBuzz e uma fonte — que entram na imagem
do backend e no ambiente da integração contínua. São três linhas de `apt-get`, cerca de 60 MB na
imagem e alguns segundos a mais no build.

Em troca, mudar o layout é mexer em HTML e CSS: dá para reposicionar um bloco, trocar uma margem ou
acrescentar uma coluna sem escrever código de posicionamento. Como o produto vai querer ajustar
esses documentos com frequência — cada assistência tem um jeito de trabalhar — o custo se paga.

## Consequências

Gerar um PDF leva cerca de 0,6 segundo, e isso acontece dentro da transação da requisição, porque
o isolamento por tenant depende de uma variável de sessão local à transação (ADR 0009). Para um
botão de impressão isso é aceitável. Se um dia incomodar, o caminho é gerar na fila e entregar por
link assinado, como já é feito com as fotos.

Como nada é guardado, o documento sempre reflete o estado atual da ordem. Isso é o que se quer no
dia a dia, mas significa que não existe cópia imutável do papel que o cliente assinou. No dia em
que assinatura digital ou guarda do documento assinado virar requisito, o caminho é guardar o PDF
junto da ordem, no mesmo armazenamento privado das fotos.

O comprovante embute as fotos da entrada em base64, até quatro delas. Isso deixa o arquivo em torno
de 90 KB, o que é irrelevante para impressão e para anexo. O recibo não leva fotos, justamente por
ser o que viaja por e-mail.

Os documentos usam a fonte DejaVu, que está na imagem. Sem ela, o PDF sairia com caixas no lugar
das letras acentuadas — é um erro silencioso e clássico de geração de PDF em container, e por isso
a fonte é instalada explicitamente em vez de depender do que a imagem base trouxer.

## Alternativas consideradas

ReportLab é Python puro e não precisaria de nenhuma biblioteca de sistema, o que deixaria a imagem
menor e o build mais rápido. O layout, porém, é escrito em código, posicionando blocos e tabelas
por coordenadas e estilos programáticos. Para um documento que vai mudar de acordo com o gosto de
cada assistência, isso vira custo recorrente de programação.

Imprimir pelo navegador, com uma página do próprio site e CSS de impressão, custaria zero e não
traria dependência nenhuma. Foi descartado porque não produz arquivo no servidor: não daria para
anexar o recibo ao e-mail de entrega nem, no futuro, guardar o documento assinado junto da ordem.
Continua sendo uma saída válida se as dependências de sistema virarem um problema em produção.

Guardar todo PDF gerado foi considerado e adiado. Traria custo de armazenamento e uma pergunta
difícil — qual versão vale — sem resolver nenhum problema que exista hoje.

## Atualização: logo da assistência no cabeçalho

O comprovante e o recibo passaram a trazer a logo da assistência, quando ela tem uma, à esquerda do
nome no cabeçalho (ADR 0025). A logo entra em base64, como as fotos, com o tamanho calculado a
partir da largura e da altura gravadas, em até 42 mm de largura e 16 mm de altura. Com a medida
fixada em milímetros, tanto uma logo quadrada quanto uma bem larga cabem no cabeçalho sem espremer
o nome da assistência nem invadir o título e o número da ordem, à direita. A linha da loja, com
endereço e telefone, continua logo abaixo do nome, como antes.
