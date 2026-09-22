# 0001 — Monorepo com backend e frontend no mesmo repositório

## Contexto

O projeto tem dois artefatos que sobem separados: uma API em Django e uma aplicação web em
Next.js. Eles evoluem juntos, porque quase toda funcionalidade nova toca os dois lados ao mesmo
tempo.

## Decisão

Backend e frontend ficam no mesmo repositório, sob `apps/api` e `apps/web`, com um
`docker-compose.yml` único na raiz e uma pipeline de CI com um job para cada lado.

## Consequências

Uma mudança que atravessa backend e frontend cabe em um commit, o que mantém o histórico
legível e evita o problema de duas versões incompatíveis publicadas em momentos diferentes. O
ambiente de desenvolvimento sobe inteiro com um comando.

O custo é que a CI roda os dois jobs em toda alteração, mesmo quando só um lado mudou. No
tamanho atual do projeto isso é irrelevante; se algum dia incomodar, filtros por caminho
resolvem sem reorganizar o repositório.

## Alternativas consideradas

Repositórios separados foram descartados porque exigiriam coordenar versões entre os dois lados
desde o primeiro dia, com um custo de processo que o tamanho do projeto não justifica.
