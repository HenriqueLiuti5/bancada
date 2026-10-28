# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Bancada é um SaaS de ordens de serviço para assistências técnicas de celular: Django 5 + DRF em
`apps/api`, Next.js 16 (App Router, React 19, Tailwind 4) em `apps/web`, PostgreSQL 17, Redis e
Celery, tudo no Docker Compose. O produto está descrito no `README.md` (em inglês); domínio,
roadmap e fase atual, em `docs/PLANO.md`; o porquê de cada decisão técnica, em `docs/adr/`.

## Ambiente

- O Python do backend fica dentro da imagem (`/opt/venv`), não no host: os comandos do backend
  rodam com `docker compose exec api ...` ou pelos atalhos do `Makefile`. O lint e os testes do site
  rodam no host, em `apps/web`, com Node 22 (`npm ci` antes da primeira vez).
- O projeto é trabalhado em três computadores. Cada um tem o próprio `.env`, criado por
  `make setup` com uma `BANCADA_ENCRYPTION_KEY` própria, e o próprio banco. Não presuma que o banco
  local tem algum dado: recrie com `make semear`, `make semear-movimento` e `make semear-plataforma`,
  que podem rodar de novo sem duplicar nada. Um campo criptografado gravado com a chave de outra
  máquina é lido como `None`.
- `make setup` não mexe num `.env` que já existe: variável nova no `.env.example` é acrescentada à
  mão no `.env` de cada máquina. `ASAAS_API_KEY` vai entre aspas simples, porque começa com `$`.
- Depois de um `git pull`, `make up` reconstrói as imagens (dependências novas do `uv.lock` e do
  `package-lock.json`) e renova o `node_modules` do container do site; a API aplica as migrações ao
  subir. O Celery não recarrega código: depois de mudar uma tarefa, `make reiniciar-worker`.
- Scripts `.sh` rodam dentro dos containers e precisam de fim de linha LF (`.gitattributes`).

## Comandos

Backend, com os serviços no ar (`make up`):

```bash
make test                                    # pytest
docker compose exec api pytest bancada/financeiro/tests/test_caixa.py::test_nome
docker compose exec api pytest -k lucro
docker compose exec api pytest --create-db   # depois de mudar migrações: o addopts tem --reuse-db
make lint                                    # ruff check, ruff format --check e mypy, como na CI
make fmt                                     # ruff format e ruff check --fix
make makemigrations
make migrate
make shell                                   # bash dentro do container da API
```

Site, em `apps/web`:

```bash
npm run lint
npm run typecheck                    # next typegen && tsc --noEmit
npm test                             # vitest, arquivos src/**/*.test.ts
npx vitest run src/lib/caixa.test.ts
npm run build
npm run e2e                          # Playwright contra http://localhost:3000; precisa de make up
npx playwright test e2e/caixa.spec.ts --project=computador   # projetos: computador e celular
```

A CI (`.github/workflows/ci.yml`) roda o lint, o mypy e o pytest da API; o lint, o typecheck, o
vitest e o build do site; e um job que monta as imagens de produção, sobe tudo com os papéis de
banco de produção, roda o Playwright contra elas e faz um backup com restauração. A
`auditoria.yml` roda `pip-audit` e `npm audit`.

## Arquitetura

### Next como BFF (ADR 0004 e 0007)

O navegador só fala com o Next. O token do DRF fica no cookie httpOnly `bancada_token`
(`src/lib/sessao.ts`), e os server components e as server actions (`acoes.ts`, com `"use server"`)
chamam o Django por `chamarApi` e `enviarArquivo` (`src/lib/api.ts`), em `API_INTERNAL_URL`. Fotos,
logos, o webhook do Asaas e a medição de visitas do Umami passam por route handlers do Next
(`app/fotos`, `app/logos`, `app/webhooks/asaas`, `app/estatisticas`). `src/proxy.ts`, o
middleware do Next 16, separa as rotas: rota pública nova entra em `SEM_LOGIN`. Os tipos das
respostas da API ficam em `src/lib/tipos.ts`.

As server actions de formulário devolvem um `EstadoDoFormulario` (`src/lib/formularios.ts`), com o
erro de cada campo e os `valores` enviados, para o formulário continuar com o que foi digitado
depois de uma recusa. O `e2e/formularios.spec.ts` confere isso em cada formulário.

### Isolamento entre assistências (ADR 0002 e 0009)

As assistências (tenants) dividem o mesmo schema, e os modelos delas herdam `PertenceAoTenant`
(`bancada/core/models.py`). Além do filtro na aplicação, as tabelas têm Row Level Security: a
política `isolamento_por_tenant` compara `tenant_id` com a variável de sessão `bancada.tenant_id`.

- `ViewDoTenant` e `ViewSetDoTenant` (`bancada/core/api.py`) definem a variável, local à transação,
  por isso `ATOMIC_REQUESTS = True`. O `ViewSetDoTenant` também filtra o queryset, grava o tenant na
  criação e aplica `AssinaturaPermiteEditar`, que deixa a assistência só para consulta quando a
  assinatura não está em dia.
- Sem a variável, a política deixa passar tudo: tarefas do Celery, comandos, o admin, o shell e a
  página pública de acompanhamento veem todas as assistências e precisam filtrar pelo tenant
  explicitamente. O painel da plataforma atravessa o isolamento de propósito, com
  `ver_todas_as_assistencias()`, e registra o acesso na auditoria.
- Tabela nova de tenant ganha uma migração `NNNN_<nome>_no_isolamento.py` com o mesmo SQL das que
  já existem (ex.: `financeiro/migrations/0004_caixa_no_isolamento.py`) e um caso no teste de
  isolamento do app (ex.: `financeiro/tests/test_isolamento.py`).
- A aplicação e os testes usam o papel `bancada_app` (`infra/postgres/init.sql`), que não é
  superusuário, porque superusuário ignora o RLS. Assim o RLS vale também no pytest. A API se recusa
  a subir com um papel que passe por cima do RLS (`bancada/core/papel_do_banco.py`).

### Domínio

- A ordem de serviço só muda de etapa pela máquina de estados (`TRANSICOES` em
  `bancada/ordens/estados.py`). Cada transição grava um `EventoOS`; comentários e troca de cliente
  gravam um `RegistroOS`. Nenhum dos dois é editado nem apagado.
- Papéis: dono, técnico e atendente, com as permissões em `bancada/tenants/permissoes.py`.
- A senha de desbloqueio do aparelho é um `CampoCriptografado` (`bancada/core/fields.py`): só técnico
  e dono a veem, toda leitura vai para a auditoria e ela é apagada sozinha sete dias depois da
  entrega.
- Auditoria: `registrar(...)` em `bancada/auditoria/registro.py`. Ação nova é um valor novo em
  `Acao` (`bancada/auditoria/models.py`), com migração.
- Cada assistência tem o seu fuso. A autenticação ativa o fuso dela (`ativar_o_fuso_da`), então
  `timezone.localdate()` é o "hoje" da loja; a assinatura usa `hoje_no_bancada()`, no horário de
  Brasília. No site, as funções de `src/lib/datas.ts` recebem o fuso como argumento.
- O aviso ao cliente sai de um sinal do `EventoOS` (`bancada/avisos/sinais.py`), que agenda a tarefa
  com `transaction.on_commit`. As tarefas periódicas ficam em `CELERY_BEAT_SCHEDULE`
  (`config/settings.py`). No desenvolvimento, os e-mails aparecem no log do worker (`make logs`).
- O painel é calculado na hora (ADR 0015), com um módulo por seção em `bancada/ordens/painel/`.
- O movimento de exemplo do `semear_movimento` fica em `bancada/core/exemplo/`: cada acontecimento
  roda na ordem do tempo, no horário das lojas, pelas mesmas funções que as telas usam, para o
  estoque, o custo médio, as contas e a gaveta baterem (ADR 0038).

### O que precisa mudar junto

- `src/lib/contratosComAApi.test.ts` lê o código Python com expressões regulares e confere que o
  site e a API combinam nos DDDs (`core/telefones.py`), nos fusos (`FusoHorario`), nas categorias e
  formas de pagamento das contas a pagar, nos tours (`TOURS` em `orientacao/serializers.py` e
  `ROTEIROS` em `src/app/(app)/roteiros.ts`), na versão dos termos e no tamanho máximo da foto.
  Mude os dois lados juntos e mantenha o formato que a regex procura.
- As paradas do tour, em `roteiros.ts`, apontam para atributos `data-tour` das telas.
- `e2e/formularios.spec.ts` confere o texto de mensagens de erro da API: mude o teste junto com elas.
- As capturas da página inicial, em `app/(inicio)/telas/`, saem do `make capturar-telas` (ADR 0038),
  num banco à parte com o movimento de exemplo: refaça-as quando as telas que elas mostram mudarem.

### Interface

- Cores só pelos tokens de `src/app/globals.css` (`bg-primario`, `text-texto-suave`...), nunca pela
  paleta padrão do Tailwind; as classes dos botões ficam em `src/componentes/ui/estilos.ts`.
- Ícones do Phosphor só por `src/componentes/icones.tsx`.

### Testes de navegador

- Importe `test` e `expect` de `e2e/apoio.ts`, não de `@playwright/test`: a fixture de lá reprova o
  teste em qualquer erro no console ou violação da CSP.
- Cada teste cria a própria assistência pelo cadastro e não depende do `semear`. São doze cadastros
  por execução, por isso o `docker-compose.yml` sobe a API com `THROTTLE_CADASTRO=100/hour`. Na CI,
  que liga o Umami, o `e2e/estatisticas.spec.ts` também roda e são catorze.

## Convenções

- Código, mensagens, comentários e documentação em português; só o README é em inglês. Comentários
  são raros e explicam o porquê.
- As fases do `docs/PLANO.md` são feitas uma de cada vez, na ordem. No começo de cada fase, o
  Henrique decide as escolhas de produto em aberto, e o PLANO registra a decisão.
- A entrega de uma fase muda tudo junto: o código; os testes da API, do site e de navegador, no
  computador e no celular; o ADR da fase (Contexto, Decisão, Consequências, Alternativas
  consideradas), que, quando é novo, entra também na tabela de `docs/adr/README.md`; a seção "Na
  entrega" do PLANO; e o "Current status" do README.
- Mensagens de commit em português, sem acentos: `Fase 4Q parte 4: lucro do mes`,
  `Plano: o que a 4R leva da 4Q`.
