# Bancada

SaaS de ordens de serviço para assistências técnicas de celular. A assistência registra o
aparelho e o defeito; o cliente final acompanha o reparo por um link público, sem precisar
criar conta.

## Estado atual

Fases 4A a 4E e 4G concluídas, do lançamento self-service; falta a publicação (4F).
A assistência abre a ordem no balcão, buscando o cliente pelo nome ou telefone ou cadastrando
cliente e aparelho na mesma tela, fotografa o aparelho, imprime o comprovante que o cliente assina
no balcão e movimenta o status; o cliente recebe o link por e-mail, acompanha o reparo sem criar
conta e, na entrega, recebe o recibo da garantia em PDF.

Na entrega, quem atende registra quanto cobrou e como o cliente pagou: PIX, dinheiro, débito ou
crédito, divididos como for preciso. O valor já vem com o total aprovado e só muda se houver
desconto. O que o cliente ficar devendo aparece como a receber na ordem, na lista e no painel, até
ser pago. O recibo mostra o desconto, cada pagamento e o que falta.

O painel mostra como a loja está agora e como foi num período à escolha — hoje, 7 dias, este mês ou
datas escolhidas —, comparado com o período anterior: ordens abertas e entregues, tempo de reparo,
tempo parado em cada etapa, aparelhos e defeitos mais comuns e clientes que voltam. O dono vê também
o dinheiro que entrou, por forma de pagamento, os descontos, o ticket médio, a taxa de aprovação de
orçamentos, o que falta receber e quanto cada técnico entregou. Cada número de contagem leva à lista
já filtrada. A lista tem busca por cliente, aparelho, IMEI, telefone ou número da OS, e os filtros
vivem na URL.

Uma assistência nova se cadastra sozinha: o dono informa o nome da assistência, o próprio nome,
e-mail, WhatsApp e senha, aceita os termos e já cai dentro do sistema. Para montar a equipe, ele
cria um convite só com nome e papel e manda o link pelo WhatsApp; quem recebe abre o link e cria a
própria senha. Todo mundo entra pelo e-mail, e quem esquece a senha recebe um link para criar
outra. O e-mail é confirmado por link, sem travar o uso.

Toda assistência nova ganha 30 dias grátis, sem informar forma de pagamento. Na última semana do
teste o dono vê um aviso no topo das telas e recebe e-mail sete dias antes e na véspera. Ele assina
na tela Assinatura informando só o CPF ou o CNPJ: a cobrança mensal é criada no Asaas, e a primeira
mensalidade vence no último dia do teste, para ele não perder nenhum dia grátis. A cada mês ele
paga por PIX, boleto ou cartão, na página de pagamento do Asaas, e pode cancelar pela própria tela.
Quem não assina, atrasa a mensalidade mais de 7 dias ou cancela continua entrando e vendo tudo, mas
o Bancada fica só para consulta até a assinatura ser regularizada. Os dados nunca são apagados.

Fora das assistências existe a conta da plataforma, a de quem administra o Bancada. Ela entra
pela mesma tela de login e cai num painel só dela: o lucro do mês, com o que as assinaturas pagaram,
as taxas do Asaas e os custos lançados à mão; a receita recorrente, a conversão do teste, as
assinaturas novas e os cancelamentos; os cadastros por semana e a receita mês a mês; e a lista das
assistências, com o contato do dono, as ordens do mês e o último acesso. Vêm primeiro na lista as
que não abriram nenhuma ordem 3 dias depois do cadastro e as que estão há 14 dias sem ordem nova,
com um botão que abre o WhatsApp do dono com a mensagem pronta. Cada cadastro novo chega também por
e-mail. O painel lê todas as assistências por um caminho próprio, registrado em auditoria, e nunca
mostra os clientes delas.

O visual é branco e limpo, com botões verdes arredondados e uma barra lateral preta, que pode ser
recolhida para mostrar só os ícones. Cada menu, cartão, indicador e status tem um ícone de traço
fino, sem fundo, e os status têm cor própria para serem achados de relance na lista. O sistema abre
sempre claro; quem preferir escolhe no menu da conta o modo escuro, em cinza-escuro. No celular, a
navegação fica numa barra embaixo da tela, como nos aplicativos. Na página que o cliente final abre,
uma barra com ícones mostra em que etapa o reparo está, junto com a previsão de entrega e os botões
para ligar ou chamar a loja no WhatsApp.

A assistência pode enviar a própria logo. Ela aparece para o cliente no topo da página de
acompanhamento, na prévia do link no WhatsApp, nos e-mails, que agora têm versão em HTML, e no
comprovante e no recibo. Quando a assistência tem mais de uma loja, o cliente vê também o nome da
loja da ordem.

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
| Interface | Paleta própria em tokens de cor, claro por padrão com escuro opcional, fonte Plus Jakarta Sans, ícones Phosphor |
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

O `make setup` cria o `.env` a partir do exemplo e gera uma chave de criptografia e um token de
webhook próprios da máquina. Essa chave protege a senha de desbloqueio dos aparelhos, então **cada ambiente tem a
sua** e ela nunca é versionada. Dados gravados com uma chave não podem ser lidos com outra.

O `make semear` cria uma assistência de exemplo com clientes, aparelhos, duas ordens de serviço e
uma foto de demonstração em cada uma. Rodar de novo não duplica nada e renova o teste grátis da
assistência de exemplo. Os usuários de demonstração
usam a senha `bancada123` e existem apenas para uso local:

| E-mail para entrar | Papel |
|---|---|
| `marcos@central.test` | dono — vê tudo, inclusive equipe e dados da assistência |
| `joana@central.test` | técnica — vê a senha de desbloqueio e apaga fotos |
| `carla@central.test` | atendente — abre ordens, não vê a senha nem apaga |
| `plataforma@bancada.local` | conta da plataforma — vê o painel com os números de todas as assistências |
| `admin` (usuário, não e-mail) | superusuário do painel administrativo do Django |

Para o painel ter números para mostrar, `make semear-movimento` cria dois meses de ordens na
assistência de exemplo, com pagamentos, descontos, valores a receber e uma segunda loja. Rodar de
novo não duplica nada.

Para o painel da plataforma ter o que mostrar, `make semear-plataforma` cria dez assistências
fictícias em situações diferentes: em teste, assinadas, com pagamento atrasado, suspensas e
canceladas, algumas sem nenhuma ordem e outras paradas, com faturas pagas e dois custos lançados.
Rodar de novo não duplica nada. Como as assinaturas delas são inventadas, a consulta de hora em hora
ao Asaas registra no log do worker um aviso para cada assinatura em andamento; é esperado.

Fora do ambiente local, a conta da plataforma não vem do `make semear`. Crie a sua com
`make conta-da-plataforma`, que pergunta nome, e-mail e senha. Ela não usa o "esqueci minha senha":
para trocar a senha, rode `docker compose exec api python manage.py changepassword seu@email`.

Para testar o caminho de uma assistência nova, abra http://localhost:3000/cadastro. Os e-mails de
confirmação, convite e recuperação de senha aparecem no log do worker (`make logs`), com o link
completo para copiar.

O botão "Fale com a gente" do menu Ajuda só aparece com o número de suporte preenchido no `.env`,
com DDD, e depois de um `make up`:

```bash
WHATSAPP_DO_SUPORTE=11912345678
```

A assinatura usa o ambiente de testes do Asaas, o Sandbox, onde nada é cobrado de verdade. A conta
do Sandbox é separada da conta de produção: crie uma em https://sandbox.asaas.com, gere uma chave
em Integrações → Chaves de API e cole no `.env` **entre aspas simples**. A chave começa com `$`, e
sem as aspas o Docker Compose a troca por um texto vazio:

```bash
ASAAS_API_KEY='$aact_hmlg_...'
```

Depois, `make up`. Sem a chave, o resto do sistema funciona normalmente; só o botão de assinar
responde que a cobrança não está configurada.

Para testar um pagamento, assine pela tela Assinatura, abra a cobrança no painel do Sandbox e
confirme o recebimento em dinheiro. O Bancada fica sabendo do pagamento de dois jeitos: pelo aviso
que o Asaas manda (webhook), que só chega a um endereço público, e por uma consulta ao Asaas a cada
hora. No ambiente local, para não esperar a hora cheia, rode `make sincronizar-cobrancas`.

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
| http://localhost:3000/plataforma | Painel da plataforma (entre com `plataforma@bancada.local` / `bancada123`) |
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
make semear-movimento  # cria dois meses de ordens e pagamentos de exemplo para o painel
make sincronizar-cobrancas  # busca no Asaas as faturas, sem esperar a consulta de hora em hora
make semear-plataforma  # cria assistências fictícias para o painel da plataforma
make conta-da-plataforma  # cria a sua conta da plataforma, que vê todas as assistências
make superuser   # cria um administrador
make clean       # derruba tudo e apaga o banco local
```

## Estrutura

```
apps/api                              Backend Django, Celery e testes
apps/web                              Frontend Next.js
apps/web/src/componentes/ui           Peças visuais reutilizáveis (botão, campo, cartão, selo...)
apps/web/src/componentes/icones.tsx   Todos os ícones do sistema, num lugar só
docs/                                 Plano do projeto e registros de decisão de arquitetura
infra/                                Infraestrutura de produção (a partir da Fase 4F)
```

## Documentação

- [Plano do projeto](docs/PLANO.md) — visão geral, domínio e roadmap
- [Decisões de arquitetura](docs/adr/) — o porquê de cada escolha técnica
