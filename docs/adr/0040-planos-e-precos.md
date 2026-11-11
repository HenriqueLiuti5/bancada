# 0040 — Planos e preços

## Contexto

Até a fase 4T, o Reparium tinha um preço só, R$ 59,90 por mês com quantas pessoas a loja quisesse,
na variável `VALOR_DA_ASSINATURA`, que a ADR 0022 já chamava de provisória. Em outubro de 2026, os
sistemas feitos para assistência técnica cobravam de R$ 49 a R$ 489,90 por mês, pelo número de
pessoas e de lojas, e os mais baratos já tinham estoque e financeiro.

No começo da fase, em 28 de outubro de 2026, o Henrique decidiu:

- Três planos, todos com todos os recursos, que mudam só pelo tamanho da assistência: Solo, com 1
  loja e até 2 pessoas, por R$ 39,90 por mês; Equipe, com 1 loja e pessoas ilimitadas, por
  R$ 59,90; e Rede, com até 3 lojas, por R$ 119,90. Acima de 3 lojas, o preço é combinado pelo
  WhatsApp do suporte.
- O anual dá dois meses grátis: R$ 399, R$ 599 e R$ 1.199. Quem cancela o anual até 7 dias depois
  de pagar recebe tudo de volta; depois disso, usa até o fim dos 12 meses pagos, sem devolução. No
  mensal continua sem devolução do mês em andamento (ADR 0039).
- As 50 primeiras assinaturas pagam cerca de 25% menos enquanto não interrompem a assinatura.
- Contam como pessoas o dono, a equipe e os convites ainda não aceitos.
- O teste de 30 dias continua com tudo liberado, e ao assinar o sistema sugere o plano que cabe.
- Subir de plano vale na hora, com o valor novo na próxima fatura e sem cobrança proporcional.
  Descer só quando a assistência cabe no plano menor, sem apagar nada.

A fase é feita em quatro partes, uma de cada vez: a escolha do plano ao assinar; os limites durante
o uso e a troca de plano; o programa de fundadores; a página inicial e os textos.

Em 3 de novembro de 2026, depois da revisão do produto e dos concorrentes (PLANO, Revisão de 3 de
novembro de 2026), o Henrique mudou essas decisões. Os preços passaram a R$ 49,90, R$ 89,90 e
R$ 179,90 por mês, ou R$ 499, R$ 899 e R$ 1.799 por ano: com R$ 39,90, e R$ 29,90 para fundadores,
o Reparium ficava abaixo do mais barato do mercado, e o InforOS só mandava WhatsApp automático a
partir de R$ 169,90. O desconto de fundador passou a 30%, o que deixa o preço de fundador perto do
que tinha sido decidido para todos. Os limites durante o uso e a troca de plano saíram da fase e são
feitos à mão enquanto forem poucos casos. A fase ficou com três partes: a escolha do plano ao
assinar; os preços novos com o programa de fundadores; a página inicial e os textos.

Em 8 de novembro de 2026, numa nova revisão (PLANO, Revisão de 8 de novembro de 2026), o Henrique
manteve os preços de 3 de novembro, reduziu as vagas de fundador de 50 para 15, com os mesmos 30%,
e encurtou o teste grátis de 30 para 15 dias. Os preços novos, o teste de 15 dias e os fundadores
entram no código na parte 2; até lá, o código continua com os preços de outubro.

## Decisão

### Parte 1: escolha do plano ao assinar

**Catálogo no código.** Os planos ficam em `PLANOS`, em `reparium/assinaturas/planos.py`, com o
limite de lojas e de pessoas e o preço mensal; o anual é dez mensalidades. A variável
`VALOR_DA_ASSINATURA` saiu, e mudar um preço passa a ser mudar o código, com teste. A assinatura
guarda o plano, o ciclo e o valor de cada cobrança, então quem já assinou continua no valor que
contratou se a tabela mudar. As assinaturas de antes viraram Equipe mensal, o preço único de então.

**O tamanho da assistência.** Contam as pessoas ativas, com o dono, os convites que ainda valem e
as lojas ativas. A tela Assinatura mostra os três planos no mensal ou no anual, desliga os que não
cabem, com o motivo, e já marca o mais barato que cabe. A API confere de novo antes de falar com o
Asaas. Com mais de 3 lojas, nenhum plano cabe, e a tela manda falar com o suporte.

**O anual no Asaas.** A assinatura vai ao Asaas com o ciclo `MONTHLY` ou `YEARLY` e uma descrição
com o plano e o ciclo, que aparece na fatura. Depois do cancelamento, o acesso vai até um ciclo
depois do último vencimento pago: um mês no mensal, um ano no anual. O aviso do topo e a tela
Assinatura chamam a cobrança do anual de anuidade.

**A devolução do anual.** Cancelar o anual até 7 dias depois do pagamento pede ao Asaas o estorno
da fatura inteira, e o acesso vai só até o dia do cancelamento, ou até o fim do teste grátis, se
ele ainda corre. PIX e cartão voltam na hora. No boleto, o Asaas devolve um link onde quem pagou
informa a conta, e a fatura mostra esse link. O estorno vem antes do cancelamento: se o Asaas
recusar o cancelamento, a fatura já ficou como estornada, e a nova tentativa não devolve de novo.
Antes de confirmar, a tela diz o que vai acontecer: o valor que volta, ou até que dia o sistema fica
liberado. As taxas do Asaas não voltam ao Reparium.

**O painel da plataforma.** A receita recorrente conta o anual dividido pelos 12 meses.

**Um Asaas falso.** `reparium/assinaturas/asaas_falso.py` responde à parte da API do Asaas que o
Reparium usa, guardando tudo na memória, e roda sem o Django. A CI das imagens de produção o sobe da
própria imagem da API e aponta a API para ele, e os testes de navegador assinam e cancelam por ele.
Um teste da API roda contra ele o cliente de verdade do Asaas.

### Partes 2 e 3: preços novos, fundadores, página inicial e textos

**Preços e teste.** `PLANOS` tem os preços de 3 de novembro e, escrito por extenso, o preço de
fundador de cada plano, porque 30% a menos não dá um valor redondo; o anual de fundador são dez
mensalidades de fundador. O teste grátis tem 15 dias para os cadastros novos; quem já estava no
teste continua com a data que tinha.

**As vagas de fundador fora do isolamento.** A página inicial e cada assinatura contam as vagas de
todas as assistências, e um pedido com a variável do tenant definida só enxerga a própria
assinatura (ADR 0009). Por isso as vagas ficam numa tabela à parte, `VagaDeFundador`, fora do RLS,
com o número da vaga, de 1 a 15, e a assistência que a ocupou, uma vaga por assistência. Ela guarda
só isso, nada que identifique um cliente final. Ao assinar, a API trava essa tabela até o fim da
transação, conta e ocupa a vaga, para duas assistências não levarem a última juntas; quem só
consulta não espera. A ocupação fica num savepoint: se o Asaas recusa a assinatura, a vaga volta.

**O desconto acaba, a vaga não volta.** `Assinatura.fundador` marca quem paga o preço de fundador.
Quando a assinatura termina, pelo dono ou pelo Asaas, o preço de fundador acaba, e quem assinar de
novo paga o preço cheio sem ocupar outra vaga. Quando a assistência é apagada, a vaga passa para a
ficha das cobranças e continua contada.

**A troca de plano à mão.** `python manage.py trocar_plano <e-mail do dono> <plano>` troca o plano,
no mesmo ciclo, pelo preço do plano novo (o de fundador, para quem é fundadora), e manda ao Asaas o
valor e a descrição novos para as próximas faturas, sem mexer nas que já existem. Descer só quando a
assistência cabe no plano menor; subir sempre. A troca fica na auditoria. O painel da plataforma
mostra o plano de cada assistência, quem é fundadora, quem passou do tamanho do plano e as vagas
ocupadas.

**Página inicial e textos.** A seção de preço mostra os três planos, com a escolha entre mensal e
anual, o preço de fundador com o cheio riscado enquanto houver vaga e as vagas que restam. Os avisos
por e-mail saíram dos argumentos de venda, e as perguntas frequentes, os termos (versão
`2026-11-08`) e o e-mail do fim do teste falam dos planos, dos fundadores e dos 15 dias.

## Consequências

O e-mail do fim do teste diz a faixa de preços dos planos e que o anual dá dois meses grátis.

No desenvolvimento, a API continua falando com o sandbox do Asaas do `.env`, e o teste de navegador
que assina pula. Para rodá-lo aqui, sobe-se o Asaas falso
(`docker compose run -d --rm --no-deps --name asaas-falso api python -m reparium.assinaturas.asaas_falso 8010`),
aponta-se a API para `http://asaas-falso:8010` e roda-se o Playwright com `ENDERECO_DO_ASAAS`.

O `VALOR_DA_ASSINATURA` que sobrar no `.env` de cada máquina deixa de ser lido e pode ser apagado.

Os limites valem só na hora de assinar: durante o uso, a assistência ainda convida pessoas e abre
lojas sem limite. Desde 3 de novembro, isso fica assim, e o Henrique acerta o plano à mão quando a
assistência passa do tamanho dele.

A oferta pública, que a ADR 0026 deixava sem consulta ao banco, passou a contar as vagas de fundador
numa consulta só.

As vagas ocupadas ficam no banco de cada máquina de uma execução para outra, e o
`semear_plataforma` ocupa vagas com as assistências de exemplo que assinaram. Por isso os testes de
navegador que mostram preço passam com ou sem vaga sobrando; num banco novo, como o da CI, quem
assina paga o preço de fundador.

## Alternativas consideradas

Preços em variáveis de ambiente, como o preço único de antes: seriam seis valores, mais os dos
fundadores, sem teste que os conferisse e diferentes em cada máquina.

Recursos diferentes por plano: os concorrentes mais baratos já têm estoque e financeiro, e o
Henrique preferiu tudo em todos os planos.

Devolver o anual à mão, pelo painel do Asaas: dependeria de alguém lembrar de fazer, e o estorno
pela API sai junto com o cancelamento.

Conferir o plano só na tela: a API é quem fala com o Asaas, e a conferência dela vale para qualquer
pedido.

O sandbox do Asaas na CI: dependeria de uma chave guardada no GitHub e da internet no meio dos
testes, e cada execução deixaria clientes e assinaturas na conta.
