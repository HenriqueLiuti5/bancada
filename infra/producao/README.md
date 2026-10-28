# Bancada em produção

Esta pasta põe o Bancada no ar num servidor Linux com Docker. Tudo roda num servidor só, descrito
em `compose.yml`:

```
internet ──► proxy (Caddy, portas 80 e 443, HTTPS automático)
                └─► web (Next) ──► api (Django + gunicorn) ──► db (Postgres) e redis
                                   worker e beat (tarefas)        backup ──► destino externo
```

Só o proxy fica aberto para a internet. A API responde apenas dentro do próprio servidor, e o painel
administrativo é aberto por um túnel SSH. As decisões estão na ADR 0032.

Todos os comandos abaixo rodam **no servidor**, dentro desta pasta (`bancada/infra/producao`),
depois de entrar nele por SSH.

## Antes de começar

Precisa estar decidido e contratado:

- **Domínio**, como `bancada.com.br`, com acesso ao painel de DNS.
- **Servidor** Linux (Ubuntu 24.04 ou mais novo), com pelo menos 2 processadores, 4 GB de memória
  e 40 GB de disco.
- **E-mail** por um provedor que envie por SMTP, com o domínio verificado nele.
- **Destino do backup**: um armazenamento compatível com S3, de preferência em outro provedor.
- **Asaas de produção**, com a chave de API.
- Opcionais: um armazenamento S3 para as fotos (sem ele, elas ficam no disco do servidor) e um
  serviço de monitoramento de erros compatível com o Sentry.

## 1. Preparar o servidor

Instale o Docker e baixe o projeto:

```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/HenriqueLiuti5/bancada.git
cd bancada/infra/producao
```

No painel de DNS do domínio, crie um registro do tipo **A** apontando o domínio para o endereço IP
do servidor. O certificado HTTPS só sai depois que o domínio aponta para cá.

Deixe abertas para a internet só as portas 22 (SSH), 80 e 443.

## 2. Configurar

```bash
sh gerar-segredos.sh
nano .env
```

O primeiro comando cria o `.env` com senhas e chaves novas. No `nano`, preencha `DOMINIO`, a chave
do Asaas, o e-mail, o destino do backup (`BACKUP_S3_*`) e o WhatsApp do suporte. Para salvar:
Ctrl+O, Enter, Ctrl+X.

**Guarde uma cópia do `.env` num gerenciador de senhas**, fora do servidor. Ela é a única forma de
recuperar o sistema se o servidor for perdido: sem a `BANCADA_ENCRYPTION_KEY`, as senhas de
desbloqueio do backup ficam ilegíveis, e sem a `BACKUP_SENHA`, o backup externo não abre.

## 3. Subir

```bash
docker compose up -d --build
docker compose ps
```

A primeira subida leva alguns minutos. No fim, `migracoes` aparece como `exited (0)`, e os outros
serviços como `running`, com `api` e `web` em `healthy`. O site responde em `https://DOMINIO`.

Crie a conta da plataforma, que vê o painel de todas as assistências:

```bash
docker compose exec api python manage.py criar_conta_da_plataforma
```

No Asaas, em Integrações → Webhooks, cadastre o endereço `https://DOMINIO/webhooks/asaas` com o
token igual ao `ASAAS_WEBHOOK_TOKEN` do `.env`. Para ligar a medição de visitas, siga
[Medição de visitas](#medição-de-visitas).

## Atualizar para uma versão nova

```bash
git pull
docker compose up -d --build
```

As migrações rodam sozinhas antes da API subir de novo.

## Painel administrativo

O `/admin/` do Django não tem rota pública. Para abri-lo, crie um túnel SSH **no seu computador**:

```bash
ssh -L 8000:127.0.0.1:8000 usuario@endereco-do-servidor
```

Com o túnel aberto, entre em http://localhost:8000/admin/ pelo Chrome. Para criar o usuário do
painel, no servidor: `docker compose exec api python manage.py createsuperuser`.

## Banco de dados

O banco tem três papéis, criados na primeira subida por `postgres/papeis.sql`:

| Papel | Para quê |
|---|---|
| `postgres` | superusuário: cria o banco e faz o backup |
| `bancada_dono` | dono das tabelas: roda as migrações |
| `bancada_app` | API, worker e agendador: só lê e grava |

A API confere o papel antes de subir e não sobe se ele for dono das tabelas, superusuário ou puder
criar bancos, porque com qualquer um deles o isolamento entre assistências deixaria de valer.

## Medição de visitas

O Umami conta as visitas às páginas abertas do site e os cadastros (ADR 0039). Ele roda no
próprio servidor, num banco só dele, e o painel responde só no servidor. Na primeira vez:

1. crie um túnel SSH **no seu computador**: `ssh -L 3001:127.0.0.1:3001 usuario@endereco-do-servidor`;
2. entre em http://localhost:3001 com o usuário `admin` e a senha `umami`, e **troque a senha na
   hora**, em Settings → Profile (o painel abre em inglês);
3. em Settings → Websites, adicione o site, com o nome Bancada e o `DOMINIO` do `.env`;
4. copie o ID do site para o `UMAMI_ID_DO_SITE` do `.env` e rode `docker compose up -d web`.

Sem o `UMAMI_ID_DO_SITE`, o site não conta nada. Para ver os números, abra o túnel e o painel do
mesmo jeito. O banco do Umami não entra no backup: perder as estatísticas não atrapalha ninguém.

## Cópia e exclusão de uma assistência

Os termos de uso prometem ao dono, a qualquer momento, uma cópia dos dados e a exclusão da conta
em até 15 dias. Os dois comandos acham a assistência pelo e-mail do dono:

```bash
docker compose exec api python manage.py exportar_assistencia dono@exemplo.com --saida /tmp/copia.zip
docker compose cp api:/tmp/copia.zip .
docker compose exec api python manage.py apagar_assistencia dono@exemplo.com
```

A cópia é um `.zip` com uma planilha por tabela, as fotos e a logo, sem as senhas de desbloqueio.
Mande-a ao dono antes de apagar. O `apagar_assistencia` pede o nome da assistência para
confirmar, cancela no Asaas a assinatura que ainda estiver cobrando e apaga tudo. As cobranças
ficam numa ficha sem nome, pela lei fiscal, e as entradas no sistema ficam até completarem 6 meses.

Sem pedido, a conta que passa 6 meses seguidos só para consulta é apagada sozinha, todo dia às
7h30, com um aviso por e-mail ao dono 30 dias antes.

## Backup

Todo dia, a partir das 3h, o serviço `backup`:

1. copia o banco para o servidor e guarda 7 dias de cópias;
2. restaura a cópia num banco de teste e confere que ela volta inteira;
3. manda a cópia, as fotos e as logos para o destino externo, criptografadas com a `BACKUP_SENHA`,
   e guarda lá 30 dias de cópias do banco e das fotos apagadas;
4. chama o `AVISO_DO_BACKUP_URL`, se houver.

O `.env` não entra no backup, de propósito. Comandos úteis:

```bash
docker compose logs backup                     # o que aconteceu nos últimos backups
docker compose exec backup backup.sh agora     # faz um backup na hora
docker compose exec backup restaurar.sh listar # mostra as cópias, no servidor e fora dele
```

## Restaurar

Este é o caminho para um servidor novo, ou para o mesmo servidor depois de perder o banco. Ele foi
testado do começo ao fim.

1. Faça o passo 1. No passo 2, em vez de rodar o `gerar-segredos.sh`, crie o `.env` com **o mesmo
   conteúdo de antes**, trazido do gerenciador de senhas.
2. Suba só o banco, que nasce vazio e com os papéis:

   ```bash
   docker compose up -d db
   ```

3. Veja as cópias e restaure a escolhida:

   ```bash
   docker compose run --rm --no-deps backup restaurar.sh listar
   docker compose run --rm --no-deps backup restaurar.sh banco banco-2026-10-18.dump
   ```

4. Se as fotos ficavam no disco do servidor, traga-as de volta:

   ```bash
   docker compose run --rm --no-deps backup restaurar.sh fotos
   ```

5. Suba o resto: `docker compose up -d --build`.

A restauração só aceita um banco vazio. No mesmo servidor, para trocar um banco estragado por uma
cópia, apague antes o banco atual. **Isto apaga todos os dados que não estão no backup:**

```bash
docker compose down
docker volume rm bancada-producao_banco
```

## Monitoramento

- **Erros**: com `SENTRY_DSN` preenchido, API, worker, agendador e site mandam cada erro ao
  serviço, sem dados pessoais.
- **Backup**: com `AVISO_DO_BACKUP_URL`, um serviço como o healthchecks.io avisa quando o backup
  do dia não acontece.
- **Site no ar**: um serviço de monitoramento pode consultar `https://DOMINIO/saude`, que responde
  200 quando o site, a API, o banco e o Redis estão funcionando, e 503 quando algum falha.

## Testar no próprio computador

Dá para subir tudo no Windows, com o Docker Desktop, antes de ter um servidor. Crie um arquivo de
configuração fora do repositório, a partir do `.env.example`, com `DOMINIO=localhost`,
`PORTA_HTTP=8080`, `PORTA_HTTPS=8443` e `PORTA_DO_ADMIN=8001`, e rode nesta pasta:

```bash
docker compose --env-file CAMINHO/DO/ARQUIVO up -d --build
```

O site abre em https://localhost:8443, com um certificado local que o navegador estranha. Para
apagar tudo depois: `docker compose --env-file CAMINHO/DO/ARQUIVO down -v`.
