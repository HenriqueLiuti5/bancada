# 0016 — Papéis, escrita protegida e gestão da equipe

## Contexto

Até aqui, qualquer usuário autenticado de uma assistência podia fazer qualquer coisa dentro dela,
com uma exceção: a senha de desbloqueio, restrita aos técnicos. Os papéis dono, técnico e
atendente existiam no modelo desde a Fase 1A, mas quase não tinham efeito.

Ao começar esta fase apareceu algo mais grave que a falta de papéis.

## A descoberta

A API de ordens era um `ModelViewSet` do DRF, que por padrão expõe listar, detalhar, criar,
substituir, alterar parcialmente e apagar. As duas primeiras e a criação tinham sido pensadas; as
outras vieram de brinde.

Um `PATCH` com `{"status": "entregue"}` levava uma ordem de *recebido* direto para *entregue*: sem
passar pela máquina de estados, sem gravar evento no histórico e sem preencher a data de entrega.
Um `DELETE` apagava a ordem inteira, e com ela o histórico que o projeto trata como imutável desde a
Fase 1A. O teste da máquina de estados passava, porque testava o método `transicionar` — e a API
simplesmente não precisava passar por ele.

A lição vale para o projeto inteiro: **viewset genérico expõe mais do que se pretende**. A regra
passa a ser declarar explicitamente os métodos HTTP de cada recurso e, em cada escrita, uma lista
fechada dos campos que podem mudar.

## Decisão

### Escrita protegida

A API de ordens aceita apenas leitura, criação e alteração parcial. A alteração parcial usa um
serializer próprio que só conhece cinco campos: diagnóstico, laudo, prazo prometido, garantia e
técnico responsável. Qualquer outro campo enviado é ignorado. Status só muda por
`/transicionar/`, que é o único caminho que grava evento.

O técnico responsável precisa ser da mesma assistência; atribuir alguém de fora é recusado.

Apagar cliente ou aparelho que tem ordem ligada devolve 409 com uma explicação, em vez do erro 500
que a proteção do banco provocava.

### Papéis

A divisão é deliberadamente grossa:

| Ação | Dono | Técnico | Atendente |
|---|---|---|---|
| Abrir ordem, cadastrar cliente e aparelho | sim | sim | sim |
| Mudar status, preencher detalhes, enviar foto, imprimir | sim | sim | sim |
| Ver a senha de desbloqueio | sim | sim | não |
| Apagar foto, cliente ou aparelho | sim | sim | não |
| Gerenciar a equipe | sim | não | não |

Assistência pequena tem duas ou três pessoas, e muitas vezes uma delas faz tudo. Uma matriz fina
— "atendente não pode mudar para *em reparo*" — pareceria rigorosa e seria contornada no primeiro
dia de movimento, com todo mundo usando o login do dono. O que ficou restrito é o que tem risco
real: o dado mais sensível, as ações destrutivas e o controle de quem entra.

A regra vive na API. A interface esconde o que o papel não permite, mas isso é conveniência:
esconder botão não é segurança, e a API recusa do mesmo jeito se a chamada vier por fora da tela.

### Equipe

Só o dono cria, altera e desativa usuários da própria assistência. Algumas travas protegem a loja
de si mesma:

- **Não se apaga usuário, se desativa.** Apagar faria o histórico perder quem fez o quê.
- **Ninguém muda o próprio papel nem se desativa.** O erro clássico é o dono se rebaixar sem querer.
- **A assistência nunca fica sem dono ativo.** Rebaixar ou desativar o último dono é recusado.
- **Redefinir a senha derruba a sessão antiga.** É para isso que se redefine senha: alguém saiu da
  equipe ou o acesso vazou.
- **Usuário criado pelo dono nunca é administrador do sistema.** Os campos de superusuário não
  existem na API.
- **Senha fraca é recusada** pelos mesmos validadores que o Django usa em todo o resto.

Toda criação, alteração e redefinição de senha fica na auditoria (ADR 0013).

## Consequências

Nome de usuário é único no sistema inteiro, e não por assistência: se já existe uma "joana" numa
loja, outra loja não pode ter a sua. Isso vem do modelo de usuário do Django e é aceitável enquanto
as contas são criadas à mão. Antes do cadastro self-service da Fase 5, o login precisa passar a ser
por e-mail ou por nome qualificado pela assistência.

A matriz de papéis é fixa no código. Se uma assistência quiser que o atendente veja a senha, hoje
não há como. Permissão configurável por assistência é possível, mas só vale o custo quando alguém
pedir.

## Alternativas consideradas

Permissões por objeto, com `django-guardian` ou as permissões de modelo do próprio Django, dariam
controle fino por registro. Foi descartado por ser muito mais do que o problema pede: a fronteira
que importa é entre assistências, e essa já é garantida pelo RLS (ADR 0009).

Manter o `ModelViewSet` completo e validar o status dentro do serializer também fecharia o buraco.
Foi preferido tirar o campo do alcance da alteração: validação esquecida é falha silenciosa, campo
ausente não tem como ser escrito.
