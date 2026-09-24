# 0018 — Contas self-service: cadastro, login por e-mail, convites e recuperação de senha

## Contexto

Até a Fase 3, toda assistência e todo usuário nasciam à mão, pelo painel administrativo ou pelo
comando de dados de exemplo. Isso acaba com o modelo de venda da Fase 4: a assistência recebe um
link, se cadastra, monta a equipe e usa o sistema sem ninguém do Bancada por perto. Tudo que um
vendedor presente resolveria precisa estar no próprio produto.

O ADR 0016 já tinha deixado um aviso: o nome de usuário é único no sistema inteiro, e isso só
funciona enquanto as contas são criadas à mão.

## Decisão

### Login por e-mail, sem trocar o modelo de usuário

O login passa a ser pelo e-mail, sem diferenciar maiúsculas. O e-mail vira único entre todos os
usuários por uma restrição no banco sobre `lower(email)`, que ignora e-mails vazios.

O campo `username` do Django continua existindo como identificador interno. Nas contas novas ele
recebe o próprio e-mail, já normalizado. A view de login procura a conta pelo e-mail e autentica
pelo `username` dela.

Trocar o `USERNAME_FIELD` do Django para `email`, ou remover o `username`, deixaria o modelo mais
limpo, mas mexeria no comando de criar superusuário, no painel administrativo e em dezenas de
testes, e exigiria preencher e-mail para todo usuário antigo antes da migração. O ganho não pagava
esse custo agora.

O dono não altera mais o e-mail de ninguém pela API. Como o e-mail é a identidade da conta e o
destino da recuperação de senha, trocá-lo pede confirmação por parte do dono do endereço, e esse
fluxo só vale o custo quando alguém precisar.

### Cadastro em um passo

Um formulário só cria a assistência, a primeira loja e a conta do dono, numa transação. O WhatsApp
informado vira o contato da assistência com o Bancada e o telefone inicial da loja, que é o que o
cliente vê. O aceite dos termos é obrigatório e fica gravado na assistência com data e versão,
além de ir para a auditoria com o endereço de origem. A resposta do cadastro já é uma sessão
aberta: o dono cai direto no sistema.

O slug da assistência deixou de ser único por coincidência. Duas assistências com o mesmo nome
agora convivem, e a segunda ganha um sufixo aleatório.

### Convite no lugar de senha definida pelo dono

O dono não cria mais usuário com senha. Ele cria um convite só com nome e papel, e opcionalmente um
e-mail, e recebe um link para mandar pelo WhatsApp. Quem recebe abre o link, informa o próprio
e-mail e cria a própria senha. Assim, a senha só é conhecida por quem a usa, e o dono não precisa
inventar nome de usuário para ninguém.

O convite vale sete dias e só pode ser usado uma vez. O aceite trava a linha do convite no banco
(`select_for_update`), para que dois cliques simultâneos não criem duas contas. O convite é dado
da assistência e tem Row Level Security como as outras tabelas; a página pública do convite o
encontra pelo token, como a página pública da ordem de serviço.

O token do convite fica guardado em texto no banco, e não como hash. Guardar só o hash seria mais
seguro contra vazamento do banco, mas o dono perderia a possibilidade de copiar o link de novo
depois de fechar a tela. Como o convite expira em sete dias, some depois de usado e só cria conta
com o papel que o dono escolheu, a troca foi considerada aceitável.

Se o e-mail com que a pessoa aceita é o mesmo para onde o convite foi mandado, ele já nasce
confirmado: o link chegou naquela caixa de entrada.

### Recuperação de senha e confirmação de e-mail

A recuperação usa o gerador de tokens do próprio Django, que invalida o link assim que a senha
muda e depois de duas horas. A resposta ao pedido é sempre a mesma, exista a conta ou não, para
que ninguém descubra quais e-mails têm cadastro. Trocar a senha pelo link encerra todas as sessões
abertas, confirma o e-mail e já abre uma sessão nova.

A confirmação de e-mail usa um link assinado com validade de sete dias, que carrega o usuário e o
endereço. Se o e-mail mudar depois, o link antigo não confirma o novo. A confirmação não trava
nada: quem não confirmou vê um aviso no topo do sistema, com um botão para reenviar o link.

O token de confirmação usa `.` como separador, e não o `:` padrão do Django. Isso veio de um teste
real no navegador que falhou: o Next entrega o trecho dinâmico da URL codificado, `:` vira `%3A`, e
a assinatura deixava de conferir. Os testes do backend não pegavam o problema porque não passam
pelo Next. Agora há um teste que garante que o token não tem nenhum caractere que precise de escape
em URL.

Os três e-mails (confirmação, convite e recuperação) saem em tarefas do Celery, disparadas só
depois que a transação confirma, com as mesmas regras de nova tentativa do aviso ao cliente.

### Cliente e aparelho cadastrados na abertura da ordem

Testando a assistência recém-cadastrada apareceu uma falha que vinha da Fase 1B: não havia tela
para cadastrar cliente nem aparelho. A abertura de ordem só listava clientes que já existiam, e eles
só nasciam pelo painel administrativo ou pelos dados de exemplo. Para uma assistência nova, a lista
vinha vazia. A mesma tela ainda carregava só a primeira página de clientes, então a partir do 26º
cliente nenhum outro aparecia.

A abertura passou a ser o atendimento de balcão inteiro: o atendente busca o cliente por nome ou
telefone e, se não achar, cadastra ali mesmo, junto com o aparelho. A mesma chamada da API aceita
cliente e aparelho existentes ou novos, e grava tudo na transação da requisição: se o aparelho vier
com erro, o cliente também não é criado. O telefone do cliente passa a ser guardado só com dígitos,
que é como a busca compara.

Quando a abertura volta com erro, a tela mantém o que foi digitado, com uma exceção deliberada: a
senha de desbloqueio não volta do servidor para o navegador e precisa ser digitada de novo.

Uma tela separada para listar e editar clientes não entrou agora. Ela não é necessária para abrir
ordens, que é o que trava uma assistência nova.

### Limite de requisições por visitante

Login, cadastro, recuperação de senha, confirmação de e-mail e convite ganharam limite de
requisições. Como toda chamada chega à API vinda do servidor do Next, o limite contaria todos os
visitantes como um só. Por isso o Next passou a repassar o endereço de quem abriu a página no
cabeçalho `X-Forwarded-For`.

## Consequências

Em produção, esse cabeçalho só é confiável se a API não for alcançável diretamente pela internet e
se o proxy na frente do Next sobrescrever o `X-Forwarded-For` que vier do visitante. Sem isso,
alguém pode escolher o próprio endereço e escapar do limite. Isso se soma à pendência do ADR 0013
sobre o endereço de origem na auditoria, e as duas ficam para a Fase 4F.

Os textos de termos de uso e política de privacidade são rascunhos, e a versão aceita no cadastro
é `2026-09-rascunho`. Quando o texto definitivo entrar na Fase 4F, quem aceitou o rascunho vai
precisar aceitar a versão nova.

O worker do Celery não recarrega código sozinho no ambiente local. Depois de mudar uma tarefa, é
preciso rodar `make reiniciar-worker`; sem isso, a tarefa nova chega ao worker antigo e é
descartada como desconhecida. Foi o que aconteceu no primeiro teste desta fase.

A assistência criada no cadastro ainda não tem período de teste nem cobrança. Isso é a Fase 4B.

## Alternativas consideradas

Manter a criação de usuário com senha definida pelo dono, ao lado do convite, daria duas formas de
fazer a mesma coisa. O convite cobre o caso inteiro, e a redefinição de senha pelo dono, que
continua existindo, resolve o funcionário que não consegue receber e-mail.

Confirmar o e-mail antes de liberar o uso reduziria contas com e-mail digitado errado, mas colocaria
uma barreira exatamente no primeiro minuto, que é quando a assistência decide se o sistema vale a
pena.
