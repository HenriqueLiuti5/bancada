# 0021 — Pagamento na entrega e painel por período

## Contexto

O painel da Fase 3B mostra como a loja está agora: o que está na bancada, o que atrasou, o que
espera o cliente. Ele não respondia à pergunta que o dono faz no fim do mês: quanto dinheiro entrou.
O sistema sabia quanto cada cliente aprovou no orçamento, mas não quanto de fato pagou, se teve
desconto, nem se o aparelho saiu da loja sem ser pago.

## Decisão

### O que a entrega registra

Ao marcar a ordem como entregue, quem atende informa o valor cobrado e como o cliente pagou. A ordem
ganha o campo `valor_cobrado`, e cada forma de pagamento vira uma linha de `Pagamento`, com forma
(PIX, dinheiro, débito ou crédito), valor, data em que o dinheiro entrou e quem registrou.

O desconto não é guardado. Ele é a diferença entre o total aprovado e o valor cobrado, e o total
aprovado não muda depois que o orçamento é enviado (ADR 0019). Um campo de desconto seria mais uma
coisa para manter de acordo com as outras duas.

Três regras valem na entrega:

- O valor cobrado não passa do total aprovado. Cobrar mais no balcão do que o cliente aprovou
  desfaria o orçamento como registro, que é o motivo de ele travar depois de enviado. O defeito
  descoberto no meio do reparo continua sem solução, como o ADR 0019 já registrava.
- Os pagamentos não somam mais que o valor cobrado. O que faltar fica a receber. O troco não é
  registrado: se o cliente deu R$ 200 para pagar R$ 150, o pagamento é de R$ 150.
- A API exige a cobrança ao entregar, mas só quando a entrega é possível. Pedir *entregue* a partir
  de outro status continua recebendo o 409 da máquina de estados, e não um pedido de cobrança.

O modelo, por outro lado, aceita entregar sem cobrança, e é assim que ficam as entregas feitas pelo
painel administrativo e as anteriores a esta fase. Nelas o `valor_cobrado` fica vazio, o que quer
dizer "não registrado", e essas ordens ficam fora de todos os números de dinheiro.

### Receber depois e corrigir

Quando o cliente paga o que ficou devendo, o pagamento é registrado na própria ordem. A data dele é
a do dia em que o dinheiro entrou, e é nesse dia que ele conta no painel. O registro trava a linha
da ordem no banco (`select_for_update`), para que dois cliques ao mesmo tempo não recebam mais do
que o saldo.

Pagamento não é editado. Lançado errado, o dono o remove e lança de novo, e a remoção fica na
auditoria como `pagamento_removido`, com a ordem, a forma e o valor. Técnico e atendente registram
pagamentos, mas não removem, seguindo a divisão do ADR 0016. O valor cobrado só é corrigido pelo
painel administrativo.

A tabela de pagamentos tem Row Level Security como as outras (ADR 0009). O pagamento herda a
assistência da ordem ao ser gravado, então nenhum caminho consegue criar um pagamento de uma
assistência numa ordem de outra.

O recibo de entrega passou a mostrar o desconto, cada pagamento e o que falta pagar. Para caber numa
folha só, o pagamento e o histórico ficam lado a lado.

### "A receber" num lugar só

A regra de ordem com saldo a receber está em `consultas.com_saldo_a_receber`, usada tanto pelo
cartão do painel quanto pela opção *A receber* da lista de ordens. É o mesmo cuidado do ADR 0015
com as atrasadas: o cartão é um link para a lista, e os dois precisam contar a mesma coisa.

### Painel por período

O painel ganhou a escolha de período: hoje, últimos 7 dias, este mês (o padrão) ou datas escolhidas,
com até 366 dias. Cada número de período vem com o do período anterior do mesmo tamanho. Para o mês,
a comparação é com o mesmo trecho do mês anterior: de 1 a 25 de setembro contra de 1 a 25 de agosto,
e não contra os 25 dias corridos anteriores. Quando o mês anterior é mais curto, o trecho para no
último dia dele.

Os limites do período são calculados no horário de Brasília e comparados direto com as datas
gravadas (maior ou igual ao início do primeiro dia e menor que o início do dia seguinte ao último).

Tudo continua calculado na hora, sem contador guardado, pelo mesmo motivo do ADR 0015. A seção
*Agora* e os valores em aberto (a receber e aprovado em aberto) não dependem do período, porque
dizem respeito ao momento presente.

Cada número tem uma definição só:

| Número | Como é calculado |
|---|---|
| Recebido | Soma dos pagamentos com data no período, separada por forma |
| Descontos | Total aprovado menos valor cobrado das entregas do período |
| Ticket médio | Média do valor cobrado das entregas do período, sem as de custo zero |
| Orçamentos aprovados | Aprovados sobre aprovados mais reprovados, entre as respostas dadas no período |
| Tempo médio de reparo | Da abertura à entrega, das ordens entregues no período |
| Tempo em cada etapa | Média do tempo entre entrar numa etapa e sair dela, das etapas que terminaram no período |
| Equipe | Ordens entregues e valor recebido no período, pelo técnico responsável pela ordem |
| Aparelhos mais atendidos | Ordens abertas no período por marca e modelo, sem diferenciar maiúsculas |
| Defeitos mais comuns | Categorias encontradas no texto do problema relatado das ordens abertas no período |
| Clientes que voltam | Dos clientes com ordem aberta no período, os que já têm mais de uma ordem |

O ticket médio deixa de fora as entregas de custo zero porque o reparo na garantia não é uma venda,
e contá-lo puxaria a média para baixo sem dizer nada sobre o preço cobrado.

O tempo em cada etapa sai do histórico da ordem (`EventoOS`): para cada mudança de status, a próxima
mudança da mesma ordem marca a saída da etapa. Isso é feito com a função de janela `LEAD` do
PostgreSQL. Uma ordem que vai e volta entre *em reparo* e *aguardando peça* conta cada passagem
separadamente. O tempo médio de reparo, que antes usava as entregas dos últimos noventa dias, passou
a seguir o período escolhido.

Os defeitos são uma heurística. O problema relatado é texto livre, escrito no balcão, então o
painel procura palavras em dez categorias (tela, bateria, carregamento, não liga, contato com
líquido, câmera, som, botões, sistema e sinal), sem diferenciar acentos. "Caiu na água e não liga"
conta em duas categorias, e um relato que não menciona nenhuma fica de fora. A triagem assistida da
Fase 5 é o caminho para uma classificação de verdade.

O filtro por loja, que só aparece para assistências com mais de uma, vale para todas as seções.
Uma loja de outra assistência é recusada.

### Quem vê o quê

A API só inclui as seções *Dinheiro* e *Equipe* na resposta quando quem pede é o dono. Não basta
esconder na tela: o técnico que abrisse o endereço da API veria os números. O *Aprovado em aberto*,
que na Fase 3B aparecia para todos, entrou nessa regra.

O plano dizia que técnico e atendente veem a parte de operação. A seção *Equipe* ficou só para o
dono porque, além do valor recebido, ela compara colegas entre si, e essa é uma ferramenta de gestão.
O *Atendimento* ficou visível para todos, porque aparelhos e defeitos frequentes ajudam quem está na
bancada a saber quais peças faltam.

### A forma visual

A comparação com o período anterior aparece em texto neutro, com sinal e porcentagem ("−14% · antes
R$ 7.446,00"), e não em verde e vermelho. Se subir é bom depende do número: mais ordens abertas é
bom, mais desconto não é, e um tempo de reparo maior é ruim. Pintar cada um exigiria decidir isso
número por número e ainda assim confundiria quem lê rápido. Taxas usam pontos percentuais.

O recebido no período é o único número em destaque grande. As divisões (por forma de pagamento,
por etapa, por aparelho, por defeito) são barras de uma cor só com o valor sempre escrito ao lado,
como a fila por status do ADR 0015.

## Consequências

As entregas anteriores a esta fase não têm valor cobrado nem pagamentos. Numa assistência que já
usava o sistema, o recebido dos meses anteriores aparece como zero, e o ticket médio e os descontos
só começam a partir das entregas novas.

Não há como registrar sinal antes da entrega, prática comum quando a peça precisa ser encomendada,
nem a taxa de orçamento cobrada quando o cliente recusa o reparo: a devolução sem reparo não
registra pagamento. As duas coisas cabem no modelo atual, e entram quando uma assistência pedir.

A equipe é atribuída pelo técnico responsável atual da ordem. Se o técnico for trocado depois da
entrega, a ordem e o dinheiro dela passam para o novo nome.

O painel faz cerca de vinte consultas por acesso. Continua valendo o caminho do ADR 0015 para
quando ficar lento.

Quem já tinha visto o tour do painel ou o da ordem não vê as paradas novas sozinho; o tour pode
ser reaberto pelo botão Ajuda.

Para o painel ter o que mostrar no ambiente local, `make semear-movimento` cria dois meses de ordens,
pagamentos, descontos e valores a receber na assistência de exemplo, com uma segunda loja. Rodar de
novo não duplica nada.

## Alternativas consideradas

Contar o recebido pela data da entrega, e não pela data do pagamento, deixaria a quitação de uma
dívida antiga no dia errado. A pergunta do dono é quanto entrou no caixa, então vale a data do
dinheiro.

Um campo obrigatório de categoria do defeito na abertura da ordem classificaria melhor que as
palavras-chave, mas acrescentaria um passo no balcão e não valeria para as ordens já abertas.

Permitir editar um pagamento, em vez de remover e lançar de novo, pouparia um clique, mas perderia
o registro do valor que estava lá antes. A remoção com auditoria guarda os dois.
