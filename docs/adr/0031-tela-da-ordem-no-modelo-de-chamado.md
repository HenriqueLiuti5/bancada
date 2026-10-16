# 0031 — Tela da ordem no modelo de chamado

## Contexto

A tela da ordem da Fase 4K ainda empilhava muita coisa. No alto, o cartão "Próximo passo" juntava a
barra de etapas, um parágrafo de explicação, as tarefas do balcão, o orçamento sendo montado e os
botões. Abaixo dele vinham os cartões de orçamento e de pagamento e três seções recolhidas: fotos,
anotações e histórico. Ao lado, mais três cartões: propriedades, link do cliente e senha. No
celular, os dados do cliente ficavam no fim da página, depois de tudo.

O pedido foi deixar a tela simples e mais fácil de usar para tudo o que ela já fazia, inspirada em
como o Milvus, sistema de chamados de TI, organiza o atendimento de um ticket. A documentação
pública do Milvus não mostra a tela do ticket por dentro; dela se tirou o modelo de trabalho. O
chamado anda por poucas colunas (a fazer, atendendo, pausados, finalizados). O técnico age por
poucos botões (iniciar, pausar, finalizar), que abrem um formulário curto quando a ação pede dados.
Tudo o que acontece vira um registro no histórico do ticket, com quem fez e quando, e os dados do
chamado ficam num painel ao lado.

## Decisão

**Cartão de ação.** No alto da tela, uma barra fina com as etapas (Recebido, Orçamento, Reparo,
Pronto, Entregue), o nome da etapa, uma frase curta do que fazer e os botões dela. O botão verde vem
sempre primeiro e leva à etapa seguinte. Ações que precisam de dados abrem um formulário dentro do
próprio cartão, com Confirmar e Cancelar, como a pausa e a finalização de um chamado:

- a aprovação de um orçamento com mais de um item pergunta o que o cliente aprovou;
- "Aguardar uma peça" pergunta qual peça falta, e a resposta vai para o histórico;
- a entrega pede o valor cobrado e como o cliente pagou;
- depois da entrega, "Registrar pagamento" recebe o que ficou faltando, já preenchido com o saldo.

As demais ações continuam em um clique. Em Recebido, o cartão traz os atalhos do balcão: fotos,
comprovante e link pelo WhatsApp.

**Ficha da ordem.** Um painel "Dados da ordem" junta o cliente, com o telefone e um botão de
WhatsApp que manda o link de acompanhamento, e também aparelho, defeito relatado, técnico, prazo
prometido, senha de desbloqueio e link do cliente. Técnico e prazo mudam ali mesmo: o técnico é
salvo ao ser escolhido, e o prazo, por um botão Salvar que aparece quando a data muda. No
computador, a ficha fica à direita; no celular, logo abaixo do cartão de ação.

**Abas.** Histórico, Orçamento, Fotos e Anotações viram abas de um mesmo cartão, no lugar das
seções empilhadas. A aba que abre depende da etapa: Fotos em Recebido, Orçamento no diagnóstico e
com o orçamento enviado, Histórico nas demais. O endereço guarda a aba aberta (`#fotos`), e os
atalhos do cartão de ação levam à aba certa. As abas seguem o padrão de acessibilidade e trocam
pelas setas do teclado.

**Histórico como o log de um chamado.** O registro mais recente vem primeiro, e cada linha traz as
iniciais de quem fez, a ação ("mudou para Em reparo", "abriu a ordem") e a hora. A linha da
abertura mostra o defeito relatado no lugar da observação automática "Ordem aberta". A linha da
entrega mostra o que foi pago nela, e os pagamentos registrados depois aparecem em linhas
próprias. As observações das mudanças de etapa e os avisos ao cliente continuam aparecendo.

**Anotações.** A aba guarda só o diagnóstico e o laudo. Técnico e prazo foram para a ficha, e cada
campo é salvo sozinho, sem reenviar os outros.

O tour da tela foi refeito para as partes novas: cartão de ação, abas, ficha, senha, link do
cliente e comprovante.

## Consequências

Quem já viu o tour da tela da ordem não o vê de novo automaticamente, porque o sistema guarda só o
nome do tour, que continua o mesmo. Ele segue disponível no menu Ajuda.

A observação livre, que antes cabia em qualquer mudança de etapa por "+ Escrever uma observação",
ficou só nos formulários que abrem no cartão: aprovação, peça que falta e entrega. As ações de um
clique, como a recusa e o reparo pronto, não pedem mais observação.

`ProximoPasso` e `AcoesDeStatus` foram substituídos por `PainelDaEtapa` e `AcoesDaEtapa`, e
`SecaoRecolhivel` ficou sem uso e saiu. A API não mudou.

## Alternativas consideradas

**Janelas sobre a tela, como no Milvus.** O sistema visual da Fase 4G não escurece o fundo
(ADR 0024), e um formulário dentro do próprio cartão mantém à vista a ordem que está sendo mexida.

**Comentários no histórico, como no ticket do Milvus.** Escrever no histórico sem mudar de etapa
exige um registro novo na API, com isolamento por assistência, e fica para uma próxima fase. Por
enquanto, o diagnóstico e o laudo cumprem esse papel.

**Ficha no fim da página no celular, como antes.** O telefone e o defeito são o que mais se consulta
no balcão. Com a ficha depois das abas, era preciso rolar a página inteira para chegar a eles.
