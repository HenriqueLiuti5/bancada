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
| [0010](0010-fotos-privadas-com-url-assinada.md) | Fotos em armazenamento privado com URL assinada |
| [0011](0011-avisos-ao-cliente-em-tarefa-assincrona.md) | Avisos ao cliente em tarefa assíncrona |
| [0012](0012-documentos-em-pdf-com-weasyprint.md) | Documentos em PDF com WeasyPrint |
| [0013](0013-auditoria-purga-e-tarefas-periodicas.md) | Auditoria da senha, purga automática e tarefas periódicas |
| [0014](0014-busca-e-filtros-na-lista-de-ordens.md) | Busca e filtros na lista de ordens |
| [0015](0015-painel-calculado-na-hora.md) | Painel calculado na hora |
| [0016](0016-papeis-escrita-protegida-e-equipe.md) | Papéis, escrita protegida e gestão da equipe |
| [0017](0017-sistema-visual.md) | Sistema visual |
| [0018](0018-contas-self-service.md) | Contas self-service: cadastro, login por e-mail, convites e recuperação de senha |
| [0019](0019-orcamento-montagem-trava-e-aprovacao-por-item.md) | Orçamento: montagem na tela, trava depois do envio e aprovação por item |
| [0020](0020-tutorial-guiado-primeiros-passos-e-contato.md) | Tutorial guiado, primeiros passos e contato |
