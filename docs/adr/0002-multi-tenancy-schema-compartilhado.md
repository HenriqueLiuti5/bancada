# 0002 — Multi-tenancy por schema compartilhado com RLS

## Contexto

Cada assistência técnica assinante é um tenant, e os dados de uma jamais podem aparecer para
outra. Um vazamento entre tenants não é um defeito comum: é o tipo de falha que encerra o
produto.

## Decisão

Uma instalação e um banco de dados servem todos os tenants. Toda tabela de domínio carrega uma
referência ao tenant, e toda consulta filtra por ela.

A proteção tem duas camadas independentes. A primeira é de aplicação: um modelo base e um
manager que aplicam o filtro por padrão, mais testes que falham se algum endpoint retornar dado
de outro tenant. A segunda é de banco: Row Level Security do PostgreSQL, que recusa a leitura
mesmo quando uma consulta escapa da primeira camada.

## Consequências

O custo de infraestrutura por tenant fica próximo de zero, o que é o que viabiliza um plano de
entrada barato. Migrações rodam uma vez, não uma vez por cliente.

Em troca, o isolamento passa a depender de disciplina de código. Por isso a segunda camada não
é opcional: ela transforma um esquecimento de filtro em erro de consulta, em vez de vazamento
silencioso.

## Alternativas consideradas

Um schema por tenant daria isolamento mais forte, mas o custo de rodar e verificar migrações em
centenas de schemas cresce rápido e trava a evolução do produto. Um banco por tenant tornaria o
custo por cliente incompatível com o preço pretendido.
