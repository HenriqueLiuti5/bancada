# 0004 — Next.js como BFF entre navegador e Django

## Contexto

O frontend é uma aplicação React separada da API. Isso levanta duas questões conhecidas: onde
guardar o token de autenticação no navegador, e como lidar com requisições entre origens
diferentes.

## Decisão

O navegador conversa apenas com o Next.js. As rotas de servidor do Next guardam o token em
cookie `httpOnly` e repassam as requisições ao Django. O Next atua como *Backend For Frontend*.

## Consequências

O token nunca fica acessível ao JavaScript da página, o que remove o vetor mais comum de roubo
de sessão em aplicações React. Como todas as requisições do navegador vão para a mesma origem,
o problema de CORS deixa de existir.

A página pública de acompanhamento é renderizada no servidor. Isso importa por um motivo
concreto: quando a assistência envia o link por WhatsApp, o WhatsApp busca a página para montar
o cartão de prévia e não executa JavaScript. Com renderização no servidor, o cartão mostra o
aparelho e o status; sem ela, mostraria uma URL crua.

O custo é um salto de rede a mais em cada requisição e um processo Node em produção.

## Alternativas consideradas

Guardar o token em `localStorage` é mais simples e é o padrão de muitos tutoriais, mas deixa a
credencial ao alcance de qualquer script carregado na página.
