# 0040 — Planos e preços

## Contexto

Até a fase 4T, o Bancada tinha um preço só, R$ 59,90 por mês com quantas pessoas a loja quisesse,
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

## Decisão

### Parte 1: escolha do plano ao assinar

**Catálogo no código.** Os planos ficam em `PLANOS`, em `bancada/assinaturas/planos.py`, com o
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
liberado. As taxas do Asaas não voltam ao Bancada.

**O painel da plataforma.** A receita recorrente conta o anual dividido pelos 12 meses.

**Um Asaas falso.** `bancada/assinaturas/asaas_falso.py` responde à parte da API do Asaas que o
Bancada usa, guardando tudo na memória, e roda sem o Django. A CI das imagens de produção o sobe da
própria imagem da API e aponta a API para ele, e os testes de navegador assinam e cancelam por ele.
Um teste da API roda contra ele o cliente de verdade do Asaas.

**Até a fase terminar.** A página inicial continua com um preço só, o do Equipe, até a parte 4
mostrar os três planos.

## Consequências

O e-mail do fim do teste diz a faixa de preços dos planos e que o anual dá dois meses grátis.

No desenvolvimento, a API continua falando com o sandbox do Asaas do `.env`, e o teste de navegador
que assina pula. Para rodá-lo aqui, sobe-se o Asaas falso
(`docker compose run -d --rm --no-deps --name asaas-falso api python -m bancada.assinaturas.asaas_falso 8010`),
aponta-se a API para `http://asaas-falso:8010` e roda-se o Playwright com `ENDERECO_DO_ASAAS`.

O `VALOR_DA_ASSINATURA` que sobrar no `.env` de cada máquina deixa de ser lido e pode ser apagado.

Na parte 1, os limites valem só na hora de assinar: durante o uso, a assistência ainda convida
pessoas e abre lojas sem limite, até a parte 2.

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
