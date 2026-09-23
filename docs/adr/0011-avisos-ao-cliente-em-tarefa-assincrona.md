# 0011 — Avisos ao cliente em tarefa assíncrona

## Contexto

O link público resolve metade do problema: o cliente consegue acompanhar o reparo sem ligar para
a loja. A outra metade é o link chegar até ele. Até aqui isso dependia de alguém na assistência
copiar o endereço e mandar no WhatsApp, o que significa que, num dia cheio, não acontece.

O sistema já tem o endereço de e-mail do cliente e já sabe exatamente quando algo muda, porque
toda transição grava um `EventoOS`. Faltava ligar as duas pontas.

## Decisão

Quando uma ordem entra num status que interessa ao cliente, ele recebe um e-mail com o link de
acompanhamento. São quatro momentos, e cada um existe por um motivo:

- **Recebido** — é assim que o link chega ao cliente, sem depender de ninguém copiar nada.
- **Orçamento enviado** — o reparo está parado esperando uma resposta dele.
- **Aguardando peça** — explica uma demora que, sem aviso, vira ligação para a loja.
- **Pronto** — é o aviso que faz o aparelho sair da prateleira.

Os outros status são movimento interno da bancada e não geram e-mail. Avisar demais treina o
cliente a ignorar os avisos.

O envio acontece numa tarefa do Celery, não no meio da requisição. O motivo é de responsabilidade:
mudar o status da ordem e avisar o cliente são coisas diferentes, e a segunda não pode derrubar a
primeira. Servidor de e-mail lento deixaria o técnico esperando na tela; servidor de e-mail fora do
ar faria a mudança de status falhar por um motivo que não tem nada a ver com a ordem de serviço.

A tarefa é disparada em `transaction.on_commit`, e isso é essencial e não óbvio. As requisições da
API são transacionais desde o ADR 0009. Sem `on_commit`, a tarefa entraria na fila ainda dentro da
transação, e o worker — que é outro processo, com outra conexão — poderia buscar no banco um evento
que ainda não foi gravado, ou que nunca será, se a transação for desfeita. Com `on_commit`, a
tarefa só é enfileirada depois que o banco confirmou a gravação.

Cada envio deixa uma linha em `AvisoDeStatus`, ligada ao evento por relação de um-para-um. Essa
linha serve a três coisas ao mesmo tempo: é a trava de idempotência, já que a tarefa desiste quando
o aviso daquele evento já foi enviado; é o registro de tentativas e do último erro, para quando o
cliente jurar que não recebeu nada; e é o que a tela da ordem mostra ao técnico, com o endereço e o
horário do envio.

Falha de envio é repetida com espera crescente, até cinco vezes. Erro que não é de rede — cliente
sem e-mail, status que não avisa, evento apagado — não vira exceção nem retentativa: a tarefa
retorna dizendo o que aconteceu e termina.

No ambiente local o backend de e-mail é o console, que imprime a mensagem no log do worker. Custo
zero, nenhuma conta para criar, e dá para ler a mensagem exatamente como o cliente vai receber. As
variáveis de SMTP existem e estão documentadas, então apontar para um servidor real é questão de
preencher o `.env`.

## Consequências

O e-mail sai depois da resposta da API. Na prática o técnico muda o status, a tela volta na hora, e
o aviso sai um instante depois; a tela só mostra "cliente avisado" no próximo carregamento. Isso é
o comportamento correto de um sistema assíncrono, e é bom que fique visível.

Se o Redis estiver fora do ar, o `delay` falha e o aviso se perde, porque não há fila para guardar
a intenção. O status muda do mesmo jeito, que é o que importa. Uma varredura periódica por eventos
sem aviso resolveria isso, e é candidata natural para a Fase 2C, junto com o Celery Beat.

O texto do e-mail segue a mesma regra da página pública: nada de IMEI, documento, sobrenome ou
anotação técnica interna. Há um teste que serializa assunto e corpo e falha se qualquer um desses
valores aparecer.

O remetente é único para todo o sistema. Cada assistência vai querer o próprio remetente, e isso
depende de domínio verificado no provedor de e-mail — decisão da Fase 6, quando houver produção.

## Alternativas consideradas

Enviar direto na requisição, sem fila, seria menos código. Foi descartado porque amarra o tempo de
resposta da tela ao tempo de um servidor de e-mail, e porque transforma uma indisponibilidade
externa em falha de uma operação que já foi concluída no banco.

Disparar a tarefa no próprio método `transicionar`, em vez de num sinal, deixaria o fluxo mais
explícito de ler. Preferiu-se o sinal em `EventoOS` porque existe mais de um caminho que cria
evento — a API, o painel administrativo e os comandos de manutenção — e o sinal cobre todos sem
repetição. O preço é que a decisão de avisar fica a um passo de distância de quem lê o modelo.

Marcar o próprio `EventoOS` com um campo "avisado em" evitaria uma tabela nova. Uma tabela separada
foi preferida porque o evento é registro imutável de auditoria desde a Fase 1A, e porque o aviso vai
ganhar outros canais: WhatsApp está no roadmap da Fase 7, e aí cada canal é uma linha, não uma
coluna nova no histórico.

Avisar em toda transição foi considerado e descartado. Quem recebe e-mail de "em diagnóstico" e
"aprovado" para de abrir o e-mail de "pronto para retirada", que é o único que faz o aparelho sair
da loja.
