# Bancada

Service order SaaS for phone repair shops. The shop registers the device and the fault; the end
customer follows the repair through a public link, without creating an account.

## Current status

Phases 4A to 4E and 4G of the self-service launch are done; only publishing (4F) is left.
The shop opens the order at the counter, looking up the customer by name or phone or registering
customer and device on the same screen, photographs the device, prints the intake receipt the
customer signs at the counter and moves the status along; the customer gets the link by email,
follows the repair without creating an account and, at pickup, receives the warranty receipt as a
PDF.

At pickup, whoever is at the counter records how much was charged and how the customer paid: PIX,
cash, debit or credit card, split however needed. The amount comes pre-filled with the approved
total and only changes if there is a discount. Whatever the customer still owes shows up as
receivable on the order, in the list and on the dashboard, until it is paid. The receipt shows the
discount, each payment and the balance due.

The dashboard shows how the shop is doing right now and how it did over a chosen period — today,
7 days, this month or custom dates —, compared with the previous period: orders opened and
delivered, repair time, time stuck in each stage, most common devices and faults, and returning
customers. The owner also sees the money that came in, by payment method, the discounts, the
average ticket, the quote approval rate, what is still receivable and how much each technician
delivered. Each count leads to the list already filtered. The list can be searched by customer,
device, IMEI, phone or order number, and the filters live in the URL.

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
the API.

The device unlock code is the most sensitive data in the system and gets its own treatment: it is
encrypted, only technicians can see it, every lookup is recorded in the audit log — denied ones
too — and it is deleted automatically seven days after pickup, once the device has no open order
left.

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

To give the dashboard numbers to show, `make semear-movimento` creates two months of orders in the
sample shop, with payments, discounts, receivables and a second store. Running it again duplicates
nothing.

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
| http://localhost:3000 | Web app (sign in with `marcos@central.test` / `bancada123`) |
| http://localhost:3000/plataforma | Platform dashboard (sign in with `plataforma@bancada.local` / `bancada123`) |
| http://localhost:8000/api/health/ | API health check |
| http://localhost:8000/admin/ | Django admin |
| http://localhost:3000/os/`token` | Public tracking page (the token appears on the order detail) |
| localhost:5433 | PostgreSQL |
| localhost:6380 | Redis |

The database and Redis ports are 5433 and 6380 on the host so they do not clash with local
installs on the default ports. Inside the Docker network the services stay on ports 5432 and
6379. To change them, set `POSTGRES_HOST_PORT` and `REDIS_HOST_PORT` in `.env`.

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
make semear-movimento  # creates two months of sample orders and payments for the dashboard
make sincronizar-cobrancas  # fetches invoices from Asaas, without waiting for the hourly check
make semear-plataforma  # creates fictional shops for the platform dashboard
make conta-da-plataforma  # creates your platform account, which sees every shop
make superuser   # creates an admin user
make clean       # stops everything and deletes the local database
```

## Structure

```
apps/api                              Django backend, Celery and tests
apps/web                              Next.js frontend
apps/web/src/componentes/ui           Reusable UI pieces (button, field, card, badge...)
apps/web/src/componentes/icones.tsx   Every icon in the system, in one place
docs/                                 Project plan and architecture decision records
infra/                                Production infrastructure (from Phase 4F on)
```

## Documentation

The documentation in `docs/` is written in Portuguese.

- [Project plan](docs/PLANO.md) — overview, domain and roadmap
- [Architecture decisions](docs/adr/) — the reasoning behind each technical choice
