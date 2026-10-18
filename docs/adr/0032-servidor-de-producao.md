# 0032 — Servidor de produção

## Contexto

A Fase 4F põe o sistema no ar. Uma parte dela depende de decisões do Henrique ainda em aberto:
domínio, provedores de servidor, e-mail, armazenamento e monitoramento, a conta de produção do
Asaas, o preço e os textos jurídicos. A outra parte não depende: como o sistema roda num servidor,
quem pode o quê no banco, o backup, o monitoramento no código e a conferência da política de
conteúdo do navegador (CSP) em produção.

Até aqui, as imagens Docker eram só de desenvolvimento: `runserver` e `next dev`, rodando como root,
e a imagem da API levava junto a pasta de fotos do computador onde era montada. Esta ADR registra a
parte que não depende de decisão.

## Decisão

**Um servidor, um Compose.** `infra/producao/compose.yml` descreve o servidor inteiro: proxy, site,
API, worker, agendador, banco, Redis e backup. É o arranjo mais barato e mais simples de operar no
começo, e não prende o Bancada a nenhum provedor: qualquer servidor Linux com Docker serve. Os
segredos ficam num `.env` na mesma pasta, criado por `gerar-segredos.sh`, e cada serviço recebe só
as variáveis que usa. A aplicação nunca vê a senha do dono das tabelas nem a do superusuário.

**Caddy na frente.** O proxy pede e renova sozinho o certificado HTTPS, redireciona HTTP para HTTPS e
repassa tudo ao Next. Ele não confia no `X-Forwarded-For` que chega da internet e escreve no lugar o
endereço real de quem acessa, que é o valor que o Next e a API leem (ADR 0029). Só ele publica
portas, a 80 e a 443. A API publica a 8000 apenas no próprio servidor, para o painel administrativo
ser aberto por um túnel SSH. Pelo endereço público, `/admin` e `/api` caem na tela de login do site.

**Imagens de produção.** Os Dockerfiles ganharam um estágio `producao`, e o desenvolvimento passou a
pedir o estágio `desenvolvimento`. A API roda no gunicorn, com os arquivos do painel administrativo
coletados na montagem da imagem e servidos pelo WhiteNoise. O site roda no servidor do Next montado
em modo `standalone`. As duas rodam sem root, e um `.dockerignore` deixa a pasta de fotos local fora
da imagem da API.

**Três papéis no banco.** O superusuário `postgres` só cria o banco e faz o backup. O `bancada_dono`
é dono das tabelas e roda as migrações, num serviço `migracoes` que termina antes de a API subir. O
`bancada_app` só lê e grava: não cria nem altera tabelas, não desliga o RLS e não cria bancos. Como
não é dono das tabelas, o RLS vale para ele mesmo sem o `FORCE`. Os papéis nascem na primeira subida
do banco, por `infra/producao/postgres/papeis.sql`.

Antes de atender, a API roda `check --deploy` com uma conferência nova sobre o papel da conexão. Ela
não sobe se o papel for superusuário ou tiver `BYPASSRLS`, e também não sobe se ele for dono de
tabelas ou puder criar bancos. A ADR 0009 conta por que isso importa: o superusuário ignora o RLS sem
avisar, e as configurações caem no `POSTGRES_USER`, que é superusuário, quando falta o
`POSTGRES_APP_USER`.

No desenvolvimento e na CI continua um papel só, dono das tabelas, porque os testes criam o banco de
teste. A CI ganhou um job que repete a produção: monta as três imagens, cria os papéis, migra com o
dono, grava os dados de exemplo e sobe a API e o site com o papel da aplicação, e no fim faz um
backup e o restaura.

**Trava do agendador.** O Celery Beat passou a usar o `AgendadorComTrava`, que só dispara tarefas
enquanto segura uma trava no Redis, renovada a cada minuto e válida por cinco. Um segundo agendador
no ar fica de reserva e assume se o primeiro parar de renovar. Quem assume conta os prazos a partir
dali, como num reinício, para não repetir de uma vez o que o anterior já disparou. Isso fecha a
pendência da ADR 0013.

**Fotos e logos.** Continuam no disco do servidor, num volume do Docker, enquanto `S3_BUCKET`
estiver vazio. Com ele preenchido, vão para um armazenamento compatível com S3, privado, pelo
`django-storages`. O endereço continua sendo nosso, assinado e com validade de 15 minutos (ADR
0010): a API busca o arquivo no armazenamento, e o Next repassa. Escolher o provedor vira
configuração.

**Backup.** Um serviço próprio, com o `pg_dump` do Postgres 17 e o rclone, faz uma cópia do banco por
dia, a partir das 3h, e guarda sete no servidor. Cada cópia é restaurada num banco de teste logo
depois de feita, e o log diz quantas migrações e ordens voltaram. Com o destino configurado, a cópia,
as fotos e as logos vão para um armazenamento compatível com S3, criptografados no próprio servidor
com a `BACKUP_SENHA`, inclusive os nomes dos arquivos. Lá ficam 30 dias de cópias do banco e das
fotos apagadas no sistema. A chave de criptografia das senhas de desbloqueio nunca entra no backup.

A restauração tem um script, `restaurar.sh`, e foi testada de ponta a ponta: com o banco, as fotos e
as cópias locais apagados, o sistema voltou só do destino externo, com as mesmas ordens, as mesmas
fotos e as senhas de desbloqueio legíveis. A API subiu passando na conferência do papel, sinal de que
as permissões do banco também voltaram.

**Monitoramento sem dados pessoais.** Com `SENTRY_DSN` preenchido, a API, o worker e o agendador
mandam os erros pelo SDK do Sentry. O site manda os erros do servidor do Next por um envio próprio,
no `onRequestError`, no formato que o Sentry e o GlitchTip aceitam. O aviso leva o tipo do erro, a
mensagem, as linhas de código e o desenho da rota, como `/os/[token]`, sem o token.

Ficam de fora cookies, cabeçalhos, corpo, query string, variáveis locais e o rastro do que aconteceu
antes do erro (breadcrumbs). O corpo de uma abertura de ordem traz a senha de desbloqueio, e o rastro
trazia as chaves do Redis, uma delas com o endereço do visitante. O envio do site sai do servidor,
então a CSP não muda. A rota `/saude` responde 200 quando site, API, banco e Redis funcionam, para um
serviço de disponibilidade consultar.

**CSP em produção.** A política de conteúdo só tinha sido exercitada no modo de desenvolvimento, que
acrescenta `'unsafe-eval'` e `ws:`. Com o servidor de produção rodando localmente por HTTPS, o
navegador passou pela página inicial, demonstração, acompanhamento, login, lista, ordem com fotos,
abertura de ordem, painel, equipe, assistência e assinatura sem nenhum bloqueio, erro no console ou
resposta com erro. O cookie de sessão sai `Secure`, e o HSTS chega pelo HTTPS.

**Termos e privacidade.** As duas páginas ganharam um rascunho completo, em linguagem simples, que
deixa claro que a assistência é a controladora dos dados dos clientes dela e o Bancada é o operador.
Os trechos que dependem de decisões ficam entre colchetes. A versão passou a `2026-10-rascunho`, nas
páginas e no registro do cadastro.

## Consequências

Publicar vira contratar, preencher o `.env` e subir o Compose. O passo a passo está em
`infra/producao/README.md`.

Tudo num servidor só tem um limite: se ele cair, o sistema cai junto, e a volta depende do backup
externo. Para o começo, com poucas assistências, isso é aceitável. Crescer passa por separar o banco.

A entrega contínua ainda não existe: atualizar é `git pull` e `docker compose up -d --build` no
servidor. A CI já monta as imagens de produção a cada envio. Com o servidor escolhido, falta
publicá-las num registro e fazer o servidor buscá-las.

A imagem do backup roda com o mesmo número de usuário da API, o 10001, para ler e restaurar as fotos
com o dono certo. O Caddy roda como root dentro do container, como na imagem oficial, para abrir as
portas 80 e 443.

A conferência do papel do banco roda em qualquer `check --deploy --database default`. No
desenvolvimento, ela aponta os dois avisos do papel único, e isso é esperado.

Os textos jurídicos continuam rascunho até um advogado revisar e os colchetes serem preenchidos.

## Alternativas consideradas

**Banco gerenciado e plataforma de aplicação (PaaS).** Tirariam das mãos do Henrique o backup e a
atualização do Postgres, mas custam várias vezes um servidor simples e prendem o Bancada ao
provedor. Se a escolha mudar, o `papeis.sql` também funciona num banco gerenciado, rodado à mão.

**Nginx no lugar do Caddy.** Exigiria tirar e renovar o certificado à parte, com o Certbot. O Caddy
faz isso sozinho, e a configuração inteira cabe em três linhas.

**SDK oficial do Sentry no Next.** O `@sentry/nextjs` envolve a montagem do site, acrescenta dezenas
de dependências e baixa um programa na instalação. O envio próprio tem poucas linhas, nenhuma
dependência e controla exatamente o que sai.

**Backup pelo Celery.** Ficaria na mesma agenda das outras tarefas, mas exigiria o `pg_dump` na
imagem da API e um papel de banco que passa por cima do RLS dentro do container que atende a
internet. Num serviço à parte, o superusuário fica longe desse código.

**Fotos sempre no S3.** Seria o desenho final, mas obrigaria a escolher e pagar mais um provedor
antes do lançamento. No disco, as fotos entram no backup externo, e a troca é só configuração.
