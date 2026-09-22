# 0003 — Celery sobre Redis, sem broker dedicado

## Contexto

O sistema precisa executar trabalho fora do ciclo da requisição: enviar notificação, gerar PDF,
chamar modelos de linguagem. A pergunta era se isso justifica um broker de mensagens dedicado,
como RabbitMQ ou Kafka.

## Decisão

Celery usando Redis como broker e como backend de resultados. Nenhum broker dedicado.

O Redis serve também de cache, e a página pública de acompanhamento usa a estratégia
*cache-aside*: a leitura tenta o Redis, e no caso de ausência busca no PostgreSQL e popula o
cache. O Redis nunca é fonte da verdade, apenas atalho.

## Consequências

Uma peça a menos para instalar, configurar, monitorar e pagar. O Redis já seria necessário para
cache, então a fila vem sem custo marginal.

A decisão de usar cache-aside em vez de um modelo de leitura alimentado por eventos elimina uma
classe inteira de defeitos: sem um projetor assíncrono, não existe a possibilidade de a página
do cliente mostrar um status desatualizado porque uma tarefa se perdeu. Uma falha no Celery
produz uma resposta mais lenta, nunca uma resposta errada.

O limite conhecido é que o Redis como broker oferece menos garantias de entrega que o RabbitMQ.
Para as tarefas atuais, todas reexecutáveis sem efeito colateral, isso é aceitável. Se surgir
trabalho que não tolere perda, a decisão será revista.

## Alternativas consideradas

RabbitMQ faria sentido como barramento de eventos entre serviços, mas o projeto tem um serviço
só até a Fase 4, e a arquitetura escolhida não depende de propagação assíncrona de estado.
Kafka foi descartado sem hesitação: o valor dele está em retenção de log, reprocessamento e
processamento de fluxo, nenhum dos quais aparece neste domínio, enquanto o custo financeiro e
operacional é alto mesmo na menor configuração.
