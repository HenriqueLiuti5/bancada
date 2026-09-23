# 0013 — Auditoria da senha, purga automática e tarefas periódicas

## Contexto

O dado mais perigoso que o Bancada guarda não é o CPF nem o IMEI: é a senha ou o padrão de
desbloqueio do aparelho. Com ela se abre a vida inteira de uma pessoa — banco, e-mail, fotos,
conversas. O plano do projeto já exigia três coisas desde a primeira linha de código, e duas
estavam feitas: o campo é criptografado em nível de campo (Fase 1A) e só usuários com papel
técnico da própria assistência conseguem lê-lo (Fase 1B). Faltavam o registro de quem viu e a
remoção automática depois da entrega.

Faltava também uma rede de segurança para os avisos da Fase 2A. O disparo acontece em
`transaction.on_commit`, e se o Redis estiver fora do ar naquele instante o aviso simplesmente se
perde: o status muda, o cliente nunca recebe nada, e ninguém fica sabendo.

## Decisão

### Auditoria

Existe uma tabela de registros de auditoria, genérica e imutável: quem, quando, qual ação, sobre
qual objeto, de qual endereço. Ela é genérica de propósito, porque auditoria nasce com um caso e
cresce — a Fase 3 traz papéis e permissões, e a Fase 5 traz cobrança, e ambas vão querer registrar
coisas.

Três ações são registradas hoje: senha consultada, consulta negada e senha removida pela purga.
Registrar a **tentativa negada** é tão importante quanto registrar o acesso bem-sucedido: um
atendente tentando ver a senha de desbloqueio repetidas vezes é exatamente o padrão que se quer
enxergar.

O registro não é editável nem apagável pelo painel administrativo. Um histórico que pode ser
alterado por quem está sendo auditado não serve para nada.

A senha só era acessível por um endpoint sem tela. Agora existe o botão na ordem de serviço, com o
aviso de que a consulta fica registrada. Isso é deliberado: o técnico precisa da senha para testar
o aparelho, e o objetivo nunca foi dificultar o trabalho dele, e sim deixar rastro.

### Purga

Uma tarefa diária remove a senha de desbloqueio dos aparelhos que já não precisam dela. Um
aparelho entra na purga quando não tem nenhuma ordem aberta e a última ordem encerrada foi
atualizada há mais de sete dias.

A carência de sete dias não é enfeite. Aparelho que volta por garantia volta nos primeiros dias, e
purgar na hora da entrega faria o técnico ligar para o cliente pedindo a senha de novo — o tipo de
atrito que faz uma regra de segurança ser desligada. A condição de não haver ordem aberta cobre o
caso de o aparelho voltar: basta abrir a nova ordem para o relógio parar.

### Tarefas periódicas

O agendador é o Celery Beat, num container próprio, com a agenda declarada em `settings.py`. Duas
tarefas estão agendadas: a purga, às 3h30, e a varredura de avisos perdidos, a cada quinze minutos.

A agenda fica no código, e não no banco. A alternativa, `django-celery-beat`, guarda a agenda em
tabelas e permite editá-la pelo painel — útil quando quem mexe na agenda não é quem mexe no código.
Aqui é a mesma pessoa, e agenda em código entra no controle de versão, sobe junto com o deploy e
não vira estado divergente entre ambientes.

O fuso do agendador é declarado explicitamente como `America/Sao_Paulo`. Sem isso, "3h30" seria
3h30 UTC, ou seja, meia-noite e meia em São Paulo.

### Varredura de avisos perdidos

A cada quinze minutos, uma tarefa procura eventos que deveriam ter gerado aviso e não geraram, e
os recoloca na fila. Três regras a mantêm honesta:

- **Só eventos das últimas 24 horas.** Se o sistema ficou fora do ar por uma semana, ninguém quer
  que os clientes recebam de uma vez avisos de uma semana atrás.
- **Só se o status do evento ainda é o status atual da ordem.** Avisar "orçamento enviado" quando o
  aparelho já está em reparo confunde mais do que ajuda.
- **Só até cinco tentativas.** Endereço de e-mail inválido não vira tentativa eterna a cada quinze
  minutos.

## Consequências

A varredura provou o próprio valor na primeira execução real: encontrou duas ordens abertas antes
da Fase 2A existir, cujos clientes nunca tinham recebido aviso nenhum, e mandou os e-mails. O
mesmo mecanismo que cobre uma queda do Redis cobre um recurso que passou a existir depois.

A purga apaga de verdade, e não há como desfazer. Se uma assistência quiser guardar a senha por
mais tempo, a carência tem que virar configuração por assistência — hoje é uma constante única.

O endereço de origem registrado é o `REMOTE_ADDR` da requisição. Quando o sistema for para
produção atrás de um proxy ou CDN (Fase 6), esse valor passa a ser o do proxy, e será preciso ler
o cabeçalho `X-Forwarded-For` com uma lista explícita de proxies confiáveis. Registrar o endereço
errado é pior do que não registrar nenhum.

O Celery Beat precisa rodar em **uma única instância**. Dois agendadores no ar disparam cada tarefa
duas vezes. A purga é idempotente e a varredura é protegida pelo registro de aviso por evento,
então o estrago seria pequeno, mas isso é sorte e não desenho — na Fase 6 isso vira uma trava
explícita.

O registro de auditoria cresce sem limite. Uma assistência movimentada gera poucas dezenas de
linhas por dia, então isso não é problema por anos. Quando for, a resposta é arquivar por período,
nunca apagar.

## Alternativas consideradas

Purgar a senha no momento exato da entrega seria o mais rigoroso e foi descartado pelo atrito com o
retorno por garantia, descrito acima.

Guardar a auditoria em arquivo de log, em vez de tabela, seria mais barato e é o que muitos
sistemas fazem. Foi descartado porque um log de aplicação é volátil, difícil de consultar por
assistência e não respeita o isolamento por tenant. A tabela entra na mesma política de Row Level
Security de todo o resto (ADR 0009), então uma assistência nunca enxerga o rastro de outra.

Marcar a hora do último acesso direto no aparelho, em vez de uma tabela de registros, guardaria
apenas o último acesso — que é justamente a informação que menos importa numa investigação.
