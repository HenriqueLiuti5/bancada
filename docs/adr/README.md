# Registros de decisão de arquitetura

Cada arquivo aqui documenta uma decisão técnica relevante: o contexto em que foi tomada, a
decisão em si, o que ela custa e quais alternativas foram descartadas. O objetivo é que, meses
depois, seja possível entender o porquê de uma escolha sem depender da memória de ninguém.

| # | Decisão |
|---|---|
| [0001](0001-monorepo.md) | Monorepo com backend e frontend no mesmo repositório |
| [0002](0002-multi-tenancy-schema-compartilhado.md) | Multi-tenancy por schema compartilhado com RLS |
| [0003](0003-celery-redis-sem-broker-dedicado.md) | Celery sobre Redis, sem broker dedicado |
| [0004](0004-next-como-bff.md) | Next.js como BFF entre navegador e Django |
| [0005](0005-fastapi-adiado-para-a-camada-de-ia.md) | FastAPI adiado para a camada de IA |
| [0006](0006-asaas-para-cobranca-recorrente.md) | Asaas para cobrança recorrente |
| [0007](0007-token-em-cookie-httponly.md) | Autenticação por token em cookie httpOnly |
| [0008](0008-pagina-publica-de-acompanhamento.md) | Página pública de acompanhamento |
| [0009](0009-isolamento-no-banco-com-rls.md) | Isolamento no banco com Row Level Security |
