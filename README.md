# Bancada

Service order SaaS for phone repair shops. The shop registers the device and the fault; the end
customer follows the repair through a public link, without creating an account.

## Current status

Phases 4A to 4E and 4G to 4S of the self-service launch are done, and so is the server side of
publishing (4F): the production setup in `infra/producao/` is ready and tested. Browser tests walk
a new shop from sign-up through an order, from the counter to pickup, and on to the customer's
tracking page, at desktop and phone sizes. They also move an order opened on the wrong customer to
the right one, and open an order in a second store, deactivate that store and switch the shop to
another time zone. Another test has a submission refused in each form, from the team invite to a
payment taken after pickup, and checks that the form keeps what was sent. The stock test registers
a part and an accessory, uses the part in an approved quote, sells accessories at the counter and
checks what needs restocking. The finance test enters a rent that repeats every month, an expense
already paid and an electricity bill, pays the overdue rent and stops the repetition. The terms of
use and the privacy policy are final, rewritten for the system as it is today, and every sign-in
is logged with its IP address for six months, as Brazil's Marco Civil da Internet requires. On
request, the owner gets a copy of the shop's data as spreadsheets with the
photos, and the account is deleted; an account left read-only for six months in a row is deleted
on its own, with an email to the owner 30 days before. Payment records stay, without the shop's
name, for the tax authorities. Visits to the public pages and sign-ups are counted with Umami, on
Bancada's own server, without cookies and without storing IP addresses; nothing inside the system
or on the customers' tracking page is counted. Before going live, 4T adds paid plans; see the
[project plan](docs/PLANO.md). The shop opens the order at the counter, looking up the customer by name or phone or registering
customer and device on the same screen, along with the promised date, photographs the device, prints
the intake receipt the customer signs at the counter and moves the status along; the customer gets
the link by email, follows the repair without creating an account and, at pickup, receives the
warranty receipt as a PDF. If something was typed wrong at the counter, anyone on the team fixes the
customer's name, phone, email or CPF and the device's brand, model, color or IMEI from the order
screen; the fix applies to all of that customer's orders and shows up on the tracking page right
away. When an open order was opened on the wrong customer, anyone on the team moves it to the right
one, found in the search or registered on the spot. The device goes along when it has no other
orders; otherwise it stays with the first customer and the right customer's device is picked or
registered. The tracking link changes, so whoever got the old one can no longer open it, and the
change is recorded in the order history and in the audit log. The team also leaves comments on the
order history at any stage, without moving the order along; the customer never sees them.

At pickup, whoever is at the counter records how much was charged and how the customer paid: PIX,
cash, debit or credit card, split however needed. The amount comes pre-filled with the approved
total and only changes if there is a discount. Whatever the customer still owes shows up as
receivable on the order, in the list and on the dashboard, until it is paid. The receipt shows the
discount, each payment and the balance due.

The dashboard shows how the shop is doing right now and how it did over a chosen period — today,
7 days, this month or custom dates —, compared with the previous period: orders opened and
delivered, repair time, time stuck in each stage, most common devices and faults, and returning
customers. The owner also sees the money that came in, from orders and counter sales, by payment
method, the discounts, the average ticket, the quote approval rate, what is still receivable and
how much each technician delivered. Each count leads to the list already filtered. Right now covers
what is on the bench, what is overdue, what is due today, what is waiting for the customer, what is
ready for pickup and how many products need restocking.
The list shows each order's deadline — today, tomorrow, the date or how many days overdue — and
can be searched by customer, device, IMEI, phone or order number; the filters live in the URL.

Whoever opens the main address without being signed in lands on the landing page, which explains
what Bancada does and leads to the free trial. It shows real screenshots of the system inside a
phone and a laptop drawn without any brand: up top, the dashboard with the money that came in and
the profit, in green, next to the page the customer receives. It presents each feature as a problem
the shop recognizes, stock with counter sales and the shop's finances among them, lists the single
plan with the price read from the same setting used for billing, and answers the usual objections in
a FAQ. It shows no customer numbers or testimonials until there are real customers. A demo at
`/demonstracao` shows the page the end customer receives, with a sample order and buttons to see
each stage of the repair. The
landing page also has a link preview image for WhatsApp, structured data, `robots.txt` and
`sitemap.xml`. Signed-in users still go straight to their orders. `make capturar-telas` retakes
the screenshots on a separate database holding six months of sample movement, so they come out the
same on any machine.

A new shop signs itself up: the owner enters the shop name, their own name, email, WhatsApp and
password, accepts the terms and lands straight inside the system. To build the team, the owner
creates an invite with just a name and a role and sends the link over WhatsApp; whoever receives it
opens the link and creates their own password. Everyone signs in with their email, and whoever
forgets their password gets a link to create a new one. The email is confirmed by link, without
blocking use.

Every new shop gets 30 days free, with no payment method required. In the last week of the trial
the owner sees a banner at the top of the screens and gets an email seven days before and on the
day before it ends. The owner subscribes on the Assinatura (Subscription) screen by entering only
their CPF or CNPJ (Brazilian individual or company tax ID): the monthly charge is created in Asaas,
and the first payment is due on the last day of the trial, so no free day is lost. Each month the
owner pays by PIX, boleto or card on the Asaas payment page, and can cancel from the same screen.
Shops that do not subscribe, are more than 7 days late on a payment or cancel can still sign in and
see everything, but Bancada becomes read-only until the subscription is back in good standing. Data
is never deleted.

Outside the shops there is the platform account, the one belonging to whoever runs Bancada. It
signs in through the same login screen and lands on a dashboard of its own: the month's profit,
with what subscriptions paid, the Asaas fees and costs entered by hand; recurring revenue, trial
conversion, new subscriptions and cancellations; sign-ups per week and revenue month by month; and
the list of shops, with the owner's contact, the month's orders and the last access. At the top of
the list come the shops that opened no order 3 days after signing up and the ones that have gone 14
days without a new order, with a button that opens the owner's WhatsApp with the message ready.
Each new sign-up also arrives by email. The dashboard reads all shops through a dedicated path,
recorded in the audit log, and never shows their customers.

The look is clean and white, with rounded green buttons and a black sidebar that can be collapsed
to show only the icons. Every menu, card, indicator and status has a thin-stroke icon with no
background, and statuses have their own color so they can be spotted at a glance in the list. The
system always opens in light mode; whoever prefers can pick dark mode, in dark gray, from the
account menu. On phones, navigation sits in a bar at the bottom of the screen, like in apps. On the
page the end customer opens, a bar with icons shows which stage the repair is in, along with the
estimated delivery date and buttons to call the shop or message it on WhatsApp.

The shop can upload its own logo. It appears to the customer at the top of the tracking page, in
the WhatsApp link preview, in the emails, which now have an HTML version, and on the intake and
pickup receipts. When the shop has more than one store, the customer also sees the name of the
order's store.

A shop with more than one address manages its stores on the Assistência (Shop) screen: the owner
adds a store, edits its phone and address and deactivates one that closed. A deactivated store no
longer shows up when opening an order, its orders carry on until pickup and the dashboard can still
filter by it; reactivating undoes it. The order screen shows the order's store whenever the shop
uses more than one.

Each shop also has its own time zone, one of Brazil's four. Sign-up picks it from the WhatsApp area
code, and the owner can change it on the same screen, which shows the current time in the chosen
zone to check against. Times on the screens, in the PDFs and in the emails, along with what counts
as today and overdue, follow the shop's time zone. The subscription stays on Brasília time, like
the Asaas charges.

The Estoque e vendas (Stock and sales) screen keeps the parts used in repairs and the accessories
sold at the counter, each with an optional barcode, cost, selling price and a minimum. Quantities
are the sum of recorded movements, each with who did it and when: purchases that arrived, with
supplier and unit cost, parts used in orders, sales, count corrections and transfers between
stores. A shop with more than one store has a separate stock in each one. A part picked from stock
goes into the quote with its name and price and leaves the order's store when the customer
approves; if it is not on the shelf, the stock goes negative and the product shows up under To
restock, on this screen and on the dashboard. The order shows the cost of its parts and the
profit, with the cost locked in at pickup. Counter sales take the products, a discount and split
payments, and only the owner can undo one. The whole team manages stock and sees cost and profit.

The Financeiro (Finance) screen starts with bills to pay. Anyone on the team enters a bill that
arrived, with a category, amount and due date, or one already paid, such as a courier paid from the
cash drawer, but only the owner sees the list and the totals and edits, pays or removes bills;
removals go to the audit log. The owner sees what is overdue, what is due in the next 7 days and
what was paid this month, with tabs for bills to pay, overdue and paid bills, a search and a
category filter. A bill can repeat every month: each month's bill shows up on its own a month before
it is due, and a change, such as a higher rent, can be carried to the following months. The
dashboard shows the owner what is overdue plus what is due in the next 7 days. On phones, the
owner's Assinatura (Subscription) link moved from the bottom bar to the account menu.

When a repair is picked up with part of the price left for later, whoever hands it over enters the
day the customer agreed to pay the rest, and the receipt shows it. Anyone on the team can move that
day when the customer asks for more time, and every agreed day goes into the order history with who
set it. The order card says when the rest is due, turns red once it is overdue and offers a ready
WhatsApp message to remind the customer. Next to bills to pay, the owner's Finance screen has
Contas a receber (Receivables): what is overdue, what is due in the next 7 days and what customers
paid this month, with tabs for open, overdue and received payments and a search by customer, device
or order number. The dashboard's To receive figure turns red when a payment is overdue.

The Caixa do dia (Daily cash) tab shows the owner each store's cash drawer: what it started the day
with, the cash that came in and went out, withdrawals and top-ups, each count and how much should be
there now, plus the totals by payment method and every movement of the day with who did it. Nobody
has to open the register: a store's first count is the starting point, and each count starts from
what was left in the drawer at the previous one, after whoever counted took some to the safe or the
bank. Technicians and front desk staff record withdrawals, top-ups and counts without seeing how
much there should be; only the owner sees whether it matched. The dashboard's Cash figure shows the
difference at each store's last count and turns red when money was missing.

The owner's dashboard also shows the profit for the chosen period: what came in through repairs and
counter sales, minus the cost of the parts in the repairs picked up and the items sold, minus the
bills paid, with the largest bill categories and the share of income left over. Parts purchases
are not counted as bills, since the parts already count as a cost when used or sold, and parts
entered without a cost are flagged. A chart next to it shows the profit for each of the last six
months, with losses below the zero line in red.

Whoever signs in for the first time learns on their own. On the first visit to each main screen, a
tour highlights the buttons one at a time and says what each one does, showing only what the
person's role can see. The owner follows a getting-started checklist that ticks itself off as they
open the first order, send the link to the customer, complete the store address and invite the
team. The Ajuda (Help) button in the sidebar reopens the screen's tour and leads to support on
WhatsApp.

Each person signs in with their own email and a role — owner, technician or front desk. The owner
manages the team and the shop details the customer sees; technicians see the unlock code;
front desk staff open orders and serve customers, but do not see the code or delete anything. An
order's status only changes through the state machine, and the history cannot be deleted through
the API. A session lasts 30 days. Ten wrong passwords lock that email out for an hour, and each
wrong password for an existing account is recorded in the audit log.

The device unlock code is the most sensitive data in the system and gets its own treatment: it is
encrypted, only technicians can see it, every lookup is recorded in the audit log — denied ones
too — and it is deleted automatically seven days after pickup, once the device has no open order
left. While the order is open, technicians and the owner can correct it on the same card, and each
change is recorded as well.

The customer notification goes out in a Celery task, triggered when the order enters a status the
customer cares about: received, quote sent, waiting for parts, ready for pickup and delivered —
the last one with the receipt attached. In the local environment the email is printed to the
worker log (`make logs`), with no account needed anywhere. To send for real, fill in the `EMAIL_*`
variables in `.env` and change `DJANGO_EMAIL_BACKEND` to
`django.core.mail.backends.smtp.EmailBackend`.

A scheduler (Celery Beat) takes care of what has to happen on its own: purging unlock codes at
3:30 AM and, every fifteen minutes, a sweep that resends notifications that got lost — for
example, if Redis was down at the exact moment of the status change.

Photos live in private storage: there is no fixed address for them. Each page generates a signed
link valid for 15 minutes, and every uploaded image is resized and re-encoded, which strips the
camera metadata — including the location where the photo was taken.

PDF documents are generated on the fly from HTML templates and carry a QR code that opens the
tracking page. The intake receipt includes the device photos; the pickup receipt is attached to
the email the customer receives when collecting the device.

## Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Database | PostgreSQL 17 with pgvector |
| Cache and queue | Redis |
| Background tasks | Celery and Celery Beat |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 |
| Interface | Custom palette in color tokens, light by default with optional dark mode, Plus Jakarta Sans font, Phosphor icons |
| Environment | Docker Compose |
| CI | GitHub Actions |
| Production | Docker Compose on a single server, with Caddy for HTTPS, gunicorn and the standalone Next server |

## Running locally

Prerequisites: Docker with the Compose plugin, Git and `make`.

```bash
git clone https://github.com/HenriqueLiuti5/bancada.git
cd bancada
make setup
make up
make semear
```

`make setup` creates `.env` from the example and generates an encryption key and a webhook token
unique to the machine. That key protects the device unlock codes, so **each environment has its
own** and it is never committed. Data written with one key cannot be read with another.

`make semear` creates a sample shop with customers, devices, two service orders and a demo photo
on each. Running it again duplicates nothing and renews the sample shop's free trial. The demo
users share the password `bancada123` and exist for local use only:

| Sign-in email | Role |
|---|---|
| `marcos@central.test` | owner — sees everything, including the team and shop details |
| `joana@central.test` | technician — sees the unlock code and deletes photos |
| `carla@central.test` | front desk — opens orders, does not see the code or delete |
| `plataforma@bancada.local` | platform account — sees the dashboard with numbers from every shop |
| `admin` (username, not email) | superuser of the Django admin |

To give the screens something to show, `make semear-movimento` creates six months of movement in
the sample shop, with a second store: orders that take parts from stock, counter sales, stock
purchases, recurring and one-off bills, receivables and the daily cash count. The dashboard's
six-month chart shows profit in ordinary months and a loss in the month new tools were bought. Each
event goes through the same code the screens use, in the order it happened. It takes about a
minute. Running it again duplicates nothing, and a database that already has the older two-month
movement keeps it.

To give the platform dashboard something to show, `make semear-plataforma` creates ten fictional
shops in different situations: on trial, subscribed, with late payment, suspended and cancelled,
some with no orders and others gone quiet, with paid invoices and two costs entered. Running it
again duplicates nothing. Since their subscriptions are made up, the hourly Asaas check logs a
warning in the worker for each active subscription; that is expected.

Outside the local environment, the platform account does not come from `make semear`. Create your
own with `make conta-da-plataforma`, which asks for name, email and password. It does not use
"forgot my password": to change the password, run
`docker compose exec api python manage.py changepassword your@email`.

To try the path of a new shop, open http://localhost:3000/cadastro. The confirmation, invite and
password recovery emails show up in the worker log (`make logs`), with the full link to copy.

The "Fale com a gente" (Talk to us) button in the Ajuda (Help) menu only appears once the support
number is filled in `.env`, with area code, and after a `make up`:

```bash
WHATSAPP_DO_SUPORTE=11912345678
```

Subscriptions use the Asaas test environment, the Sandbox, where nothing is actually charged. The
Sandbox account is separate from the production account: create one at https://sandbox.asaas.com,
generate a key under Integrações → Chaves de API (Integrations → API Keys) and paste it into `.env`
**in single quotes**. The key starts with `$`, and without the quotes Docker Compose replaces it
with an empty string:

```bash
ASAAS_API_KEY='$aact_hmlg_...'
```

Then `make up`. Without the key, the rest of the system works normally; only the subscribe button
replies that billing is not configured.

To test a payment, subscribe on the Assinatura (Subscription) screen, open the charge in the
Sandbox dashboard and confirm it as received in cash. Bancada learns about the payment in two
ways: through the notification Asaas sends (webhook), which only reaches a public address, and
through an hourly check against Asaas. Locally, to avoid waiting for the top of the hour, run
`make sincronizar-cobrancas`.

Uploaded photos live in `apps/api/media/`, which is not under version control.

If `docker compose` is not recognized but `docker-compose` exists, the plugin is not registered.
This fixes it, without admin rights:

```bash
mkdir -p ~/.docker/cli-plugins
ln -sf "$(command -v docker-compose)" ~/.docker/cli-plugins/docker-compose
```

Available services:

| Address | What it is |
|---|---|
| http://localhost:3000 | Landing page when signed out; web app after signing in (`marcos@central.test` / `bancada123`) |
| http://localhost:3000/demonstracao | Demo of the page the end customer sees |
| http://localhost:3000/plataforma | Platform dashboard (sign in with `plataforma@bancada.local` / `bancada123`) |
| http://localhost:8000/api/health/ | API health check |
| http://localhost:8000/admin/ | Django admin |
| http://localhost:3000/os/`token` | Public tracking page (the token appears on the order detail) |
| localhost:5433 | PostgreSQL |
| localhost:6380 | Redis |

The database and Redis ports are 5433 and 6380 on the host so they do not clash with local
installs on the default ports. Inside the Docker network the services stay on ports 5432 and
6379. To change them, set `POSTGRES_HOST_PORT` and `REDIS_HOST_PORT` in `.env`. Every port,
including the site's and the API's, answers only on this computer (127.0.0.1), not on the local
network.

## Production

`infra/producao/` puts Bancada on a single Linux server with Docker: Caddy in front, with automatic
HTTPS, then the Next server, the API on gunicorn, the Celery worker and scheduler, PostgreSQL, Redis
and a backup service. Only ports 80 and 443 are open to the internet; the Django admin is reached
through an SSH tunnel. The step-by-step guide, in Portuguese, is in
[infra/producao/README.md](infra/producao/README.md).

- **Database roles.** The tables belong to a role that only runs migrations; the API, worker and
  scheduler use a role that can only read and write. The API refuses to start if its role is a
  superuser, can bypass row-level security, owns tables or can create databases.
- **Backup.** Every day the database, the photos and the logos are copied, the database copy is
  restored into a scratch database to prove it comes back, and everything goes encrypted to
  S3-compatible storage outside the server. A full restore from that storage alone was tested.
- **Photos.** They stay on the server's disk unless `S3_BUCKET` is set, in which case they go to
  private S3-compatible storage. Either way, the browser only sees our signed, short-lived links.
- **Monitoring.** With `SENTRY_DSN` set, errors from the API, the Celery tasks and the Next server
  go to Sentry or a compatible service, without cookies, headers, request bodies, query strings,
  local variables or breadcrumbs. `/saude` reports whether the site, API, database and Redis are up.
- **Scheduler lock.** Celery Beat only fires tasks while it holds a lock in Redis, so a second
  scheduler started by mistake waits on standby.

A CI job builds the production images and runs them the way production does: it creates the
database roles, migrates as the table owner, seeds data and starts the API and the site with the
application role, runs the browser tests against them, then takes a backup and restores it.

## Commands

```bash
make help        # lists every command
make setup       # creates .env with a new encryption key
make up          # starts the services, with the frontend node_modules refreshed
make down        # stops the services
make logs        # follows the logs
make reiniciar-worker  # Celery does not reload on its own: run after changing a task
make test        # runs the backend tests
make lint        # runs ruff and mypy
make migrate     # applies migrations
make semear      # fills the database with demo data
make semear-movimento  # creates six months of sample orders, stock, sales, bills and cash counts
make sincronizar-cobrancas  # fetches invoices from Asaas, without waiting for the hourly check
make semear-plataforma  # creates fictional shops for the platform dashboard
make conta-da-plataforma  # creates your platform account, which sees every shop
make superuser   # creates an admin user
make clean       # stops everything and deletes the local database
```

The site's tests run on the machine itself, with Node 22 or newer, from `apps/web`:

```bash
cd apps/web
npm ci                           # once, and again when the dependencies change
npm test                         # tests the functions that check and format data
npx playwright install chromium  # once
npm run e2e                      # opens the site in a browser and walks the main paths
```

`npm run e2e` opens http://localhost:3000, so the services have to be up (`make up`). It fails on
any error in the browser console, including Content Security Policy violations. Each run signs up
twelve new shops, six per screen size, named "Assistência Teste" plus a code, in the local database.
Production allows 10 sign-ups per hour from the same address, so the development `docker-compose.yml`
starts the API with `THROTTLE_CADASTRO=100/hour` unless `.env` sets another value. In CI the API runs
with `THROTTLE_CADASTRO=30/hour`, so a retried test still has room. To test another address, set
`ENDERECO_DO_SITE`.

## Structure

```
apps/api                              Django backend, Celery and tests
apps/web                              Next.js frontend
apps/web/e2e                          Browser tests (Playwright)
apps/web/src/app/(inicio)             Landing page, its sections and the system screenshots
apps/web/src/componentes/ui           Reusable UI pieces (button, field, card, badge...)
apps/web/src/componentes/icones.tsx   Every icon in the system, in one place
docs/                                 Project plan and architecture decision records
infra/postgres                        Database role for local development and CI
infra/producao                        Production server: Compose, proxy, database roles and backup
```

## Documentation

The documentation in `docs/` is written in Portuguese.

- [Project plan](docs/PLANO.md) — overview, domain and roadmap
- [Architecture decisions](docs/adr/) — the reasoning behind each technical choice
