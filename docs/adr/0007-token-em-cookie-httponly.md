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
