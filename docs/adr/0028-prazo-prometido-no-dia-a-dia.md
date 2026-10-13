# 0028 — Prazo prometido no dia a dia

## Contexto

O prazo prometido ao cliente existe desde o começo, no campo `prometida_para` da ordem. A lista
filtra as atrasadas desde a Fase 3A (ADR 0014), e o painel as conta desde a 3B (ADR 0015). Na
comparação com o InforOS, que abre o sistema com um bloco de prazos (vencidas, hoje, amanhã), três
falhas apareceram:

- o prazo só podia ser informado depois de abrir a ordem, em Detalhes do reparo, então o comprovante
  impresso na hora saía sem a previsão;
- o painel só avisava depois do atraso: às 9h, a loja não via o que precisava ficar pronto naquele
  dia;
- a lista mostrava quando a ordem foi aberta, não quando ela precisa ficar pronta.

## Decisão

**Prazo na abertura.** O formulário de nova ordem ganhou o campo "Prazo prometido", opcional, na
seção que passou a se chamar "Defeito e prazo". Na abertura, a API recusa data anterior a hoje,
porque ali ela é quase sempre erro de digitação. A edição em Detalhes do reparo continua aceitando
qualquer data: o formulário reenvia o prazo a cada salvamento, e uma ordem já atrasada não deixaria
salvar o diagnóstico se a regra valesse ali também.

**"Para hoje".** É a ordem aberta com prazo igual à data de hoje, no horário de Brasília, como as
atrasadas. Ela virou um quinto indicador do painel, entre "Atrasadas" e "Esperando o cliente", e um
recorte da lista (`?para_hoje=1`), ao lado de "Atrasadas". O indicador e o recorte usam a mesma regra,
em `consultas.para_hoje`, pelo motivo da ADR 0015: o número do painel tem de bater com a lista que
ele abre. As duas contagens nunca se misturam, porque atrasada é prazo antes de hoje.

**Coluna Prazo.** Ela ocupa o lugar da data de abertura na lista. O texto é curto para caber na
coluna: "Hoje", "Amanhã", a data ("12 de out."), "Ontem" ou "Há 3 dias". A cor vai só no ícone, como
no status (ADR 0024): despertador vermelho para o que venceu, relógio laranja para o que vence hoje e
calendário cinza para o resto. Ordem encerrada ou sem prazo mostra um traço. No celular, a linha de
baixo de cada ordem diz "Prazo hoje", "Venceu há 3 dias" e assim por diante, e a parte do prazo some
quando não há prazo.

**Encerrada na API.** A lista passou a trazer `prometida_para` e `encerrada`. O frontend usa
`encerrada` em vez de deduzir pelo status ou pelas transições possíveis.

**Grade de cinco.** Cinco indicadores cabem numa linha a partir de 1280 px de largura. De 640 a
1279 px a grade tem três colunas, e abaixo disso, duas.

## Consequências

A lista perdeu a data de abertura. Ela continua na tela da ordem, e as ordenações "Mais recentes" e
"Mais antigas" ainda seguem a abertura.

A imagem da lista na página inicial foi refeita com a coluna nova, como pede a ADR 0026, sem o aviso
de assinatura da loja de exemplo.

## Alternativas consideradas

**Prioridade alta, média e baixa, como no InforOS.** Seria mais um campo a preencher em toda ordem.
No próprio print do InforOS, 1.136 das 1.400 ordens estão em "baixa", o que sugere um valor padrão
que ninguém muda. Numa loja com um a três técnicos, o prazo já ordena a fila.

**"Amanhã" e "No prazo" no painel, como no InforOS.** "Amanhã" já aparece na lista. "No prazo" é um
número que não leva a nenhuma ação.

**Data de abertura e prazo lado a lado na lista.** Nas telas menores, a coluna do aparelho e do
cliente ficaria estreita demais.
