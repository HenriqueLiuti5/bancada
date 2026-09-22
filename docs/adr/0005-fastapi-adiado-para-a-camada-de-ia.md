# 0005 — FastAPI adiado para a camada de IA

## Contexto

FastAPI estava previsto no projeto desde o início. Manter Django e FastAPI no mesmo produto,
porém, custa dois deploys, duas configurações de teste e a tentação constante de compartilhar o
ORM entre eles, que é onde esse arranjo costuma apodrecer.

## Decisão

Nenhum serviço FastAPI até a Fase 4. Da Fase 1 à 3, Django com DRF atende tudo, inclusive a
página pública. Na Fase 4, um serviço FastAPI separado assume a camada de inteligência
artificial.

## Consequências

As fases iniciais têm uma peça a menos, o que acelera o caminho até um produto utilizável.

Quando o serviço de IA entrar, ele terá uma fronteira real que justifica a separação: respostas
transmitidas em fluxo, que é o comportamento natural do FastAPI e o desconfortável no Django;
chamadas demoradas a modelos de linguagem, que não devem ocupar processos da API principal; e
escala e custo próprios, isolados do núcleo transacional.

## Alternativas consideradas

Criar o serviço FastAPI desde a Fase 1 daria a arquitetura final mais cedo, mas sem carga nem
fronteira que a justificassem. Um segundo serviço lendo o mesmo banco do Django seria
complexidade sem contrapartida.
