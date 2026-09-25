# Bancada

SaaS de ordens de serviço para assistências técnicas de celular. A assistência registra o
aparelho e o defeito; o cliente final acompanha o reparo por um link público, sem precisar
criar conta.

## Estado atual

Fases 4A e 4C concluídas, do lançamento self-service; a 4B, de assinatura, ficou para depois. A
assistência abre a ordem no balcão, buscando o cliente pelo nome ou telefone ou cadastrando cliente
e aparelho na mesma tela, fotografa o aparelho, imprime o comprovante que o cliente assina no
balcão e movimenta o status; o cliente recebe o link por e-mail, acompanha o reparo sem criar conta
e, na entrega, recebe o recibo da garantia em PDF.

O painel mostra como a loja está: o que está na bancada, o que passou do prazo, o que espera o
cliente aprovar e quanto dinheiro aprovado ainda não entrou. Cada número leva à lista já filtrada.
A lista tem busca por cliente, aparelho, IMEI, telefone ou número da OS, e os filtros vivem na URL.

Uma assistência nova se cadastra sozinha: o dono informa o nome da assistência, o próprio nome,
e-mail, WhatsApp e senha, aceita os termos e já cai dentro do sistema. Para montar a equipe, ele
cria um convite só com nome e papel e manda o link pelo WhatsApp; quem recebe abre o link e cria a
própria senha. Todo mundo entra pelo e-mail, e quem esquece a senha recebe um link para criar
outra. O e-mail é confirmado por link, sem travar o uso.

Quem entra pela primeira vez aprende sozinho. Na primeira visita a cada tela principal, um tour
destaca os botões um de cada vez e diz o que cada um faz, mostrando só o que o papel da pessoa
enxerga. O dono acompanha uma lista de primeiros passos que se marca sozinha conforme ele abre a
primeira ordem, manda o link ao cliente, completa o endereço da loja e convida a equipe. O botão
Ajuda, na barra lateral, reabre o tour da tela e leva ao WhatsApp de suporte.

Cada pessoa entra com o próprio e-mail e um papel — dono, técnico ou atendente. O dono gerencia a
equipe e os dados da assistência que aparecem para o cliente; técnicos veem a senha de
desbloqueio; atendentes abrem ordens e atendem, mas não veem a senha nem apagam nada. O status de uma ordem só muda pela máquina de estados, e o histórico não
pode ser apagado pela API.

A senha de desbloqueio do aparelho é o dado mais sensível do sistema, e tem tratamento próprio:
fica criptografada, só técnicos conseguem vê-la, toda consulta fica registrada em auditoria — as
negadas também — e ela é apagada automaticamente sete dias depois da entrega, quando o aparelho
não tem mais nenhuma ordem aberta.

O aviso ao cliente sai numa tarefa do Celery, disparada quando a ordem entra num status que
interessa a ele: recebido, orçamento enviado, aguardando peça, pronto para retirada e entregue —
este último com o recibo em anexo. No ambiente local o e-mail é impresso no log do worker
(`make logs`), sem precisar de conta em lugar nenhum. Para enviar de verdade, preencha as
variáveis `EMAIL_*` do `.env` e troque `DJANGO_EMAIL_BACKEND` por
`django.core.mail.backends.smtp.EmailBackend`.

Um agendador (Celery Beat) cuida do que precisa acontecer sozinho: a purga das senhas às 3h30 e,
a cada quinze minutos, uma varredura que reenvia avisos que se perderam — por exemplo, se o Redis
estiver fora do ar no momento exato da mudança de status.

As fotos ficam em armazenamento privado: não existe endereço fixo para elas. Cada página gera um
link assinado que vale 15 minutos, e toda imagem enviada é reduzida e regravada, o que descarta os
metadados da câmera — inclusive a localização de onde a foto foi tirada.

Os documentos em PDF são gerados na hora, a partir de templates HTML, e levam um QR Code que abre
a página de acompanhamento. O comprovante de entrada traz as fotos do aparelho; o recibo de
entrega vai anexado ao e-mail que o cliente recebe quando retira o aparelho.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Banco | PostgreSQL 17 com pgvector |
| Cache e fila | Redis |
| Tarefas assíncronas | Celery e Celery Beat |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 |
| Interface | Tokens de cor próprios com modo claro e escuro, fonte Geist, ícones Lucide |
| Ambiente | Docker Compose |
| CI | GitHub Actions |

## Como rodar

Pré-requisitos: Docker com o plugin Compose, Git e `make`.

```bash
git clone https://github.com/HenriqueLiuti5/bancada.git
cd bancada
make setup
make up
make semear
```

O `make setup` cria o `.env` a partir do exemplo e gera uma chave de criptografia própria da
máquina. Essa chave protege a senha de desbloqueio dos aparelhos, então **cada ambiente tem a
sua** e ela nunca é versionada. Dados gravados com uma chave não podem ser lidos com outra.

O `make semear` cria uma assistência de exemplo com clientes, aparelhos, duas ordens de serviço e
uma foto de demonstração em cada uma. Rodar de novo não duplica nada. Os usuários de demonstração
usam a senha `bancada123` e existem apenas para uso local:

| E-mail para entrar | Papel |
|---|---|
| `marcos@central.test` | dono — vê tudo, inclusive equipe e dados da assistência |
| `joana@central.test` | técnica — vê a senha de desbloqueio e apaga fotos |
| `carla@central.test` | atendente — abre ordens, não vê a senha nem apaga |
| `admin` (usuário, não e-mail) | superusuário do painel administrativo do Django |

Para testar o caminho de uma assistência nova, abra http://localhost:3000/cadastro. Os e-mails de
confirmação, convite e recuperação de senha aparecem no log do worker (`make logs`), com o link
completo para copiar.

O botão "Fale com a gente" do menu Ajuda só aparece com o número de suporte preenchido no `.env`,
com DDD, e depois de um `make up`:

```bash
WHATSAPP_DO_SUPORTE=11912345678
```

As fotos enviadas ficam em `apps/api/media/`, que não vai para o controle de versão.

Se `docker compose` não for reconhecido mas `docker-compose` existir, o plugin não está
registrado. Isso resolve, sem precisar de administrador:

```bash
mkdir -p ~/.docker/cli-plugins
ln -sf "$(command -v docker-compose)" ~/.docker/cli-plugins/docker-compose
```

Serviços disponíveis:

| Endereço | O que é |
|---|---|
| http://localhost:3000 | Aplicação web (entre com `marcos@central.test` / `bancada123`) |
| http://localhost:8000/api/health/ | Verificação de saúde da API |
| http://localhost:8000/admin/ | Administração do Django |
| http://localhost:3000/os/`token` | Acompanhamento público (o token aparece no detalhe da OS) |
| localhost:5433 | PostgreSQL |
| localhost:6380 | Redis |

As portas do banco e do Redis são 5433 e 6380 no host para não conflitar com instalações
locais nas portas padrão. Dentro da rede do Docker os serviços continuam nas portas 5432 e
6379. Para mudar, ajuste `POSTGRES_HOST_PORT` e `REDIS_HOST_PORT` no `.env`.

## Comandos

```bash
make help        # lista todos os comandos
make setup       # cria o .env com uma chave de criptografia nova
make up          # sobe os serviços, com o node_modules do frontend renovado
make down        # derruba os serviços
make logs        # acompanha os logs
make reiniciar-worker  # o Celery não recarrega sozinho: rode depois de mudar uma tarefa
make test        # roda os testes do backend
make lint        # roda ruff e mypy
make migrate     # aplica migrações
make semear      # popula o banco com dados de demonstração
make superuser   # cria um administrador
make clean       # derruba tudo e apaga o banco local
```

## Estrutura

```
apps/api                      Backend Django, Celery e testes
apps/web                      Frontend Next.js
apps/web/src/componentes/ui   Peças visuais reutilizáveis (botão, campo, cartão, selo...)
docs/                         Plano do projeto e registros de decisão de arquitetura
infra/                        Infraestrutura de produção (a partir da Fase 4F)
```

## Documentação

- [Plano do projeto](docs/PLANO.md) — visão geral, domínio e roadmap
- [Decisões de arquitetura](docs/adr/) — o porquê de cada escolha técnica
