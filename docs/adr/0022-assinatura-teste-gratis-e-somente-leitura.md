# 0022 — Assinatura pelo Asaas, teste grátis e modo só de consulta

## Contexto

O Bancada é vendido à distância: a assistência se cadastra, testa e assina sem falar com ninguém.
Até aqui ela se cadastrava e usava tudo de graça, sem prazo. O ADR 0006 já tinha escolhido o Asaas
e fixado três cuidados: webhook idempotente, webhook verificado antes de qualquer processamento e
uma máquina de estados explícita, `trial → ativa → inadimplente → suspensa → cancelada`. Esta fase
liga tudo isso ao produto.

Três regras de negócio foram decididas pelo Henrique ao começar a fase: a tolerância para uma
mensalidade atrasada é de 7 dias; quem assina durante o teste paga a primeira mensalidade só no fim
do teste; e o próprio dono pode cancelar pela tela, com confirmação.

## Decisão

### O teste nasce com a assistência

Toda assistência ganha uma assinatura em teste de 30 dias no momento em que é criada. Isso acontece
num sinal de `post_save` do `Tenant`, e não dentro do cadastro, pelo mesmo motivo do ADR 0011: há
mais de um caminho que cria assistência — o cadastro, o painel administrativo, o `make semear` e os
testes — e o sinal cobre todos. As assistências que já existiam ganharam 30 dias a partir da
migração. O `make semear` renova o teste da assistência de exemplo a cada execução, para o ambiente
local nunca ficar só para consulta.

### A situação é calculada a partir de fatos

A situação da assinatura não depende de alguém lembrar de mudá-la. Ela sai de três fatos: a data
de fim do teste, se existe assinatura no Asaas e as faturas. A regra vive numa função só, que
devolve um retrato da assinatura num dia qualquer:

| Fatos | Situação | Edita? |
|---|---|---|
| Sem assinatura, dentro do teste | Em teste | sim |
| Sem assinatura, teste vencido | Suspensa | não |
| Com assinatura, nenhuma fatura atrasada | Ativa | sim |
| Fatura atrasada há até 7 dias | Pagamento atrasado | sim |
| Fatura atrasada há mais de 7 dias | Suspensa | não |
| Cancelada | Cancelada | só até o fim do período pago |

A tolerância conta do vencimento, e uma fatura em aberto depois do vencimento já conta como
atrasada, mesmo que o Asaas ainda não tenha avisado. A trava de edição consulta esse cálculo a cada
pedido, então a virada à meia-noite não depende de tarefa nenhuma. A coluna `situacao` do banco é
uma fotografia desse cálculo, atualizada pelos eventos do Asaas e por uma revisão diária às 7h, e
existe para listagens como o painel da plataforma da Fase 4E.

### Assinar

O Asaas exige CPF ou CNPJ para cadastrar o cliente, então o dono informa um dos dois ao assinar. A
validação acontece antes de chamar o Asaas, com os dígitos verificadores, e já aceita o CNPJ com
letras, que a Receita passou a emitir em julho de 2026.

A assinatura é criada no Asaas com a forma de pagamento em aberto. A cada mês o dono escolhe PIX,
boleto ou cartão na página de pagamento do próprio Asaas, e o Bancada não precisa de tela para isso.
Uma página da documentação do Asaas dizia que assinatura não aceita forma em aberto; o teste no
Sandbox mostrou que aceita, e é o que vale.

A primeira mensalidade vence no último dia do teste, então quem assina cedo não perde dia grátis.
Quem assina depois do teste paga a partir do dia em que assinou e volta a editar na hora. Quem
cancelou e assina de novo começa a pagar quando acaba o período que já tinha pago.

Se o Asaas falhar depois de criar o cliente, o identificador do cliente fica guardado e é
reaproveitado na próxima tentativa, em vez de criar um cliente duplicado.

### Cancelar

O dono cancela pela tela, depois de uma confirmação. O Bancada remove a assinatura no Asaas, cancela
as faturas em aberto e mantém a edição liberada até o fim do período já pago — ou até o fim do teste,
se ele cancelar durante o teste. Depois disso, a assistência fica só para consulta, com todos os
dados guardados.

### Só para consulta

Assistência sem assinatura em dia continua entrando, vendo tudo e imprimindo os documentos, mas não
altera nada. A trava é uma permissão do DRF, `AssinaturaPermiteEditar`, que recusa os métodos que
escrevem. Ela está na lista de permissões que todos os viewsets da assistência herdam, e entra de
forma explícita nas views do dono que montam a própria lista.

Para que uma view nova não escape por esquecimento — a lição do ADR 0016 —, um teste percorre todas
as rotas da API e falha se alguma rota que escreve não tiver a trava. Hoje são 40 rotas. As exceções
são declaradas no próprio teste: entrar, sair e recuperar a conta; as preferências do tutorial; a
própria assinatura, para dar para regularizar; e o webhook.

A página pública de acompanhamento continua funcionando: o cliente da assistência não tem culpa da
mensalidade atrasada.

### O aviso de pagamento do Asaas

O Asaas avisa por webhook cada mudança numa cobrança. O aviso chega ao Next, em `/webhooks/asaas`, e
é repassado ao Django, como todo o resto (ADR 0004). O Django confere o token que o Asaas manda no
cabeçalho `asaas-access-token`, com comparação em tempo constante, e recusa tudo se o servidor não
tiver token configurado.

Cada evento tem um identificador, e ele é gravado numa tabela própria na mesma transação do
processamento. Evento repetido é reconhecido e ignorado; se o processamento falhar, a transação
inteira volta e o Asaas manda de novo. Cobrança de uma assinatura que não é do Bancada é ignorada.
Ao identificar a assistência, o processamento passa a valer só para ela no banco (ADR 0009).

Webhook se perde: o servidor pode estar fora do ar, e o Asaas pausa a fila depois de 15 falhas
seguidas. Por isso uma tarefa consulta o Asaas a cada hora e atualiza as faturas das assinaturas
ativas, a mesma ideia da varredura de avisos do ADR 0013. Ela também faz o ambiente local funcionar
sem endereço público.

### Interface própria

O resto do sistema fala com um `ProvedorDeCobranca`, e não com o Asaas (ADR 0006). O cliente do
Asaas usa a biblioteca padrão do Python para HTTP, sem dependência nova. Os testes trocam o provedor
por um falso, e nenhum teste chama a internet.

### Avisos de fim do teste

O dono recebe um e-mail sete dias antes do fim do teste e outro na véspera, uma vez cada, e vê o
aviso no topo das telas na última semana. As faturas, o lembrete de vencimento e o aviso de atraso
são mandados pelo próprio Asaas. A lista de primeiros passos ganhou o passo de assinar, como previa o
ADR 0020.

## Consequências

Quem assina durante o teste aparece como "Ativa" enquanto o teste continua. A tela explica que o
teste segue até o fim e que a primeira mensalidade vence nesse dia.

Boleto leva até três dias úteis para compensar. A tolerância de 7 dias cobre isso; a assistência só
fica só para consulta se não pagar nada até lá.

O valor da mensalidade vem da variável `VALOR_DA_ASSINATURA` e é provisório: o preço ainda está em
aberto no plano. O valor fica gravado na assinatura no momento em que ela é feita, então mudar a
variável vale só para as próximas assinaturas.

A chave do Asaas começa com `$`, e o Docker Compose trata `$` no `.env` como variável. A chave precisa
ficar entre aspas simples; sem elas, ela chega vazia ao sistema.

O Sandbox pode mandar e-mail e SMS de verdade para os contatos das cobranças de teste. Testes usam
endereços `.test`.

Pagamento com cartão não é cobrado sozinho todo mês, porque a forma fica em aberto: o dono entra na
fatura e paga, como faria com PIX. Se alguém pedir cobrança automática no cartão, é preciso uma tela
de captura do cartão.

Se o Asaas criar a assinatura e o Bancada falhar antes de gravá-la, a assinatura fica órfã no Asaas.
É improvável, e aparece no painel do Asaas, mas nada no Bancada detecta isso hoje.

## Alternativas consideradas

Mudar a situação só pelos eventos do webhook seria mais simples de escrever e frágil de operar: um
webhook perdido deixaria a assistência na situação errada, e o fim do teste, que não gera evento
nenhum, precisaria de uma tarefa no horário exato.

Fazer o dono escolher uma forma fixa de pagamento no Bancada permitiria cobrar o cartão
automaticamente, ao custo de uma tela de captura de cartão e de mais estados para tratar. Ficou para
quando alguém pedir.

Bloquear também a consulta quando a assinatura está suspensa pressionaria mais pelo pagamento, mas os
dados são da assistência (ADR 0006), e travar o acesso a eles por falta de pagamento é o tipo de
coisa que faz alguém nunca mais voltar.

A trava de edição num middleware do Django pegaria todas as rotas de uma vez, mas a autenticação por
token acontece dentro do DRF, depois do middleware: ali ainda não se sabe quem é o usuário.

O link de pagamento avulso do Asaas, gerado todo mês pelo Bancada, evitaria a assinatura recorrente,
mas colocaria no Bancada o trabalho de gerar, lembrar e conferir cada cobrança, que o Asaas já faz.
