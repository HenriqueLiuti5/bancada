# 0007 — Autenticação por token guardado em cookie httpOnly

## Contexto

O frontend em React é uma aplicação separada da API. Era preciso decidir como o usuário se
autentica e onde a credencial fica guardada no navegador.

## Decisão

A API emite um token por usuário, usando o mecanismo de token do Django REST Framework. Quem
guarda esse token é o servidor do Next.js, num cookie marcado como `httpOnly`. O navegador nunca
vê o token: as páginas chamam o servidor do Next, que lê o cookie e repassa a chamada ao Django
com o cabeçalho de autorização.

## Consequências

O token não fica ao alcance do JavaScript da página, o que elimina o vetor mais comum de roubo
de sessão em aplicações React. Como o navegador só conversa com a própria origem, não há CORS
nem token trafegando em código de cliente.

Autenticação por token também dispensa o mecanismo de proteção contra CSRF que a autenticação
por sessão exigiria, o que simplifica bastante o repasse feito pelo Next.

O limite conhecido é que o token do DRF não expira sozinho. Enquanto o produto não tem clientes
pagantes, isso é aceitável, e o `logout` apaga o token no servidor, então a revogação funciona.
Antes de colocar em produção com clientes reais, esse token precisa ganhar expiração e rotação.

## Alternativas consideradas

Guardar o token em `localStorage` é o padrão de muitos tutoriais e deixa a credencial acessível a
qualquer script carregado na página. Sessão do Django funcionaria, mas exigiria buscar e repassar
o token de CSRF a cada operação de escrita, sem ganho de segurança neste desenho.

## Atualização: o proxy nunca rodava e a sessão que termina no meio do uso

Desde a Fase 1B, o arquivo que deveria mandar quem não tem sessão para o login, e quem tem sessão
para longe do login, estava em `apps/web/middleware.ts`. Com a pasta `src/`, o Next só procura esse
arquivo dentro dela, então ele nunca rodou. A proteção das páginas continuou funcionando por outro
caminho: toda página chama a API, e a API sem token redireciona para o login. O que não funcionava
era a volta: quem já estava logado e abria `/login` ou `/cadastro` via o formulário de novo.

O arquivo foi para `src/proxy.ts`, que é o nome que o Next 16 dá a esse recurso.

Ligar o proxy criaria um laço com o cookie de um token que não vale mais, por exemplo depois de a
senha ser redefinida: a página manda para o login porque a API recusou o token, e o proxy manda de
volta porque o cookie existe. Por isso, quando a API responde 401, o Next redireciona para
`/login?sessao=expirada`, e nessa rota o proxy apaga o cookie e a tela explica que a sessão
terminou. Dentro de uma ação de formulário o cookie é apagado na hora, porque ali o Next permite
mudar cookies e o login é desenhado na mesma resposta, sem passar pelo proxy.

Apareceu junto um defeito que atingia todos os formulários. O `redirect()` do Next funciona
lançando um sinal, e as ações tinham `try/catch` em volta da chamada à API: o sinal era capturado
como se fosse erro, e quem estava com a sessão vencida via "Não foi possível falar com o servidor"
em vez de ir para o login. Todo `catch` passa por `mensagemDaApi`, que agora devolve esses sinais
ao Next com `unstable_rethrow` antes de transformar qualquer coisa em mensagem.
