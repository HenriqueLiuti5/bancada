# 0015 — Painel calculado na hora

## Contexto

A lista de ordens responde "onde está a ordem X?". Faltava responder a pergunta que o dono faz
ao abrir a loja: "como estamos?". Quantas ordens estão na bancada, o que já passou do prazo, o que
está parado esperando o cliente aprovar, quanto dinheiro aprovado ainda não entrou no caixa.

## Decisão

### Os números

O painel mostra oito indicadores e a fila por status. Cada indicador existe porque leva a uma ação:

- **Na bancada** e **Atrasadas** dizem o tamanho do problema e onde está o fogo.
- **Esperando o cliente** é orçamento enviado sem resposta: reparo parado e dinheiro parado.
- **Prontas** é aparelho ocupando prateleira e pagamento a receber.
- **Aguardando peça** explica demora que não é culpa da bancada.
- **Aprovado em aberto** soma só os itens aprovados de ordens ainda abertas.
- **Tempo médio de reparo** usa as entregas dos últimos noventa dias, para refletir como a loja
  trabalha hoje e não como trabalhava no primeiro mês.

Todo indicador que corresponde a um filtro é um link para a lista já filtrada. O painel é o ponto
de partida do trabalho, não um relatório para ser lido e fechado.

### Calcular na hora, sem contador guardado

Os números são calculados a cada acesso com agregações no banco — contagens condicionais numa
única consulta, mais uma para a fila por status, uma para a média e uma para a soma. Não há
contador guardado nem cache.

Contador guardado precisaria ser atualizado em todo lugar que muda uma ordem, e o primeiro caminho
esquecido faria o painel mentir sem ninguém perceber. Calculado na hora, o número está sempre
certo por construção. Com o isolamento por tenant, cada assistência agrega só a própria fatia, e
isso custa milissegundos.

### Uma regra, um lugar

"Atrasada" é definida numa única função, usada tanto pelo painel quanto pelo filtro da lista.
Isso não é detalhe de organização: o card de atrasadas é um link para a lista filtrada por
atrasadas, e se as duas regras divergissem o card diria 3 e a lista mostraria 2.

### A forma visual

Os números de destaque são cartões simples: rótulo, valor e uma linha explicando o que o número
significa. A fila por status é uma tabela com barras de uma cor só, e não um gráfico com uma cor
por status: com dez categorias, dez cores deixam de ser distinguíveis entre si, especialmente para
quem tem daltonismo, e cada linha já tem seu nome escrito ao lado. A barra só dá a noção de
proporção; o número exato está sempre escrito.

A única cor de alerta é a das atrasadas, e só quando o número é maior que zero. Ela nunca aparece
sozinha: o rótulo "Atrasadas" está sempre ali.

## Consequências

Quando uma assistência tiver volume suficiente para o painel ficar lento, o caminho é uma visão
materializada atualizada pela fila, ou cache por tenant com validade curta. Nenhum dos dois é
necessário agora, e ambos trariam a pergunta de quão velho o número pode estar.

Não há comparação com o período anterior ("12 abertas, 3 a mais que ontem"). Isso exige guardar
uma fotografia diária dos números, e é candidato natural para a fase de relatórios.

A página não tem teste automatizado de interface; o frontend do projeto ainda não tem esse tipo
de teste. O que tem teste é a API que produz os números, incluindo o isolamento entre assistências.
