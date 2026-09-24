# 0019 — Orçamento: montagem na tela, trava depois do envio e aprovação por item

## Contexto

O modelo de itens do orçamento existe desde a Fase 1A: cada item é uma peça ou um serviço, com
descrição, valor e a marca de aprovado. A tela da ordem mostrava os itens, a página pública também,
e o recibo os imprimia. Só não havia como criá-los: nenhuma rota da API e nenhum campo na tela.
Os itens só nasciam pelo painel administrativo ou pelo comando de dados de exemplo, e por isso a
falta passou despercebida até uma assistência de teste tentar montar um orçamento.

Olhando o fluxo inteiro apareceram mais dois buracos:

- Nada marcava item como aprovado. O painel da Fase 3B soma o "valor aprovado em aberto" pelos
  itens aprovados, então para qualquer ordem real esse número seria sempre zero. A Fase 4D, que vai
  preencher o valor recebido com o total aprovado, herdaria o mesmo zero.
- Era possível mudar o status para *orçamento enviado* sem nenhum item. O cliente recebia o e-mail
  "o orçamento já está disponível" e abria uma página com total de R$ 0,00.

## Decisão

### Montagem

Quem atende adiciona e remove itens no cartão "Orçamento" da tela da ordem. A API tem
`POST /api/ordens/{id}/itens/` para criar e `DELETE /api/itens/{id}/` para remover, e nada além
disso. Seguindo o ADR 0016, a rota de itens declara só os métodos que usa: não há edição. Para
corrigir um valor, remove-se o item e cria-se de novo, o que numa lista de três ou quatro itens
custa um clique a mais.

O valor aceita zero, para o reparo na garantia, e recusa negativo. Desconto não é item de
orçamento; ele entra junto com o registro do pagamento, na Fase 4D.

Os três papéis montam orçamento. Pela divisão do ADR 0016, isso é trabalho do dia a dia, como
preencher o diagnóstico, e não uma ação destrutiva.

### Trava depois do envio

O orçamento só muda enquanto a ordem está em *recebido* ou *em diagnóstico*. A partir de
*orçamento enviado*, a API recusa criar e remover itens com 409.

O produto existe para que haja registro quando houver divergência sobre preço. Se o orçamento
pudesse mudar depois que o cliente o viu, a página pública deixaria de ser esse registro.

Mudar o status para *orçamento enviado* sem nenhum item é recusado com uma mensagem que diz o que
fazer.

### Aprovação por item

É comum o cliente aprovar só parte do orçamento: troca a tela, mas deixa a bateria para depois.
Por isso a aprovação é por item, como o modelo já previa.

Na tela, enquanto a ordem espera resposta e o orçamento tem mais de um item, o cartão "Mudar
status" mostra a lista de itens, todos marcados. Quem atende desmarca o que o cliente recusou e
clica em *Aprovado*. A API recebe a lista em `itens_aprovados`. Sem a lista, aprova todos. Com a
lista vazia, recusa e sugere *Reprovado*, que é o caminho para o cliente que não quis nada.

A marcação acontece dentro de `OrdemServico.transicionar`, na mesma transação da mudança de status.
Qualquer caminho que aprove uma ordem, inclusive o painel administrativo, marca os itens.

Depois da aprovação, a tela mostra os itens recusados riscados e o total aprovado. A página pública
e o recibo mostram só o que foi aprovado, porque é isso que o cliente paga.

## Consequências

Não existe como refazer um orçamento depois de enviado. Se o técnico descobre outro defeito no meio
do reparo, hoje ele registra numa observação e acerta o valor com o cliente fora do sistema. A
saída certa é um caminho de volta na máquina de estados, com a mudança registrada no histórico, e
vale construí-lo quando uma assistência pedir.

A escolha dos itens aprovados não fica no histórico da ordem, só na marca de cada item. O evento
de aprovação registra quem aprovou e quando, e o recibo mostra o quê.

## Alternativas consideradas

Aprovar sempre o orçamento inteiro seria mais simples, mas obrigaria o recibo a cobrar o que o
cliente recusou, ou obrigaria a assistência a mentir no sistema.

Permitir editar o orçamento enquanto ele espera resposta resolveria a aprovação parcial apagando os
itens recusados. Foi descartado porque apaga justamente o registro do que foi oferecido e recusado.

Travar o envio de orçamento vazio dentro do modelo, e não na API, protegeria também o painel
administrativo. Foi descartado porque dezenas de testes levam ordens até *orçamento enviado* sem
itens para testar outras coisas, e o painel administrativo é usado só pelo Henrique.
