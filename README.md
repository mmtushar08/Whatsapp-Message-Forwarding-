# WhatsApp Message Forwarding (Cloud API)

[![CI](https://github.com/mmtushar08/Whatsapp-Message-Forwarding-/actions/workflows/ci.yml/badge.svg)](https://github.com/mmtushar08/Whatsapp-Message-Forwarding-/actions/workflows/ci.yml)

A **production-ready WhatsApp Message Forwarding application** built with **Node.js + TypeScript + Express.js** and the **WhatsApp Cloud API (Meta)**. Automatically forwards incoming WhatsApp messages to a target number, with optional keyword-based filtering.

This repository is now evolving in two layers:
- the current `apps/forwarder` backend and admin dashboard for one managed deployment
- a planned hosted web product where users create accounts and manage forwarding from the browser

The hosted web product direction is documented in:
- `docs/WEB_PRODUCT_FLOW.md`
- `docs/MVP_REQUIREMENTS.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

---

## ✨ Features

- 📨 **Automatic message forwarding** — forwards messages received on your WhatsApp number to any target number
- 🔍 **Optional keyword filtering** — only forward messages matching specific keywords
- 🪝 **Webhook support** — receives messages via Meta's webhook (POST) and handles verification (GET)
- 📝 **Structured logging** — Winston-powered logging to console and `logs/app.log`
- 🔐 **Secure config** — all credentials via `.env` (never hardcoded)
- 🏗️ **Monorepo structure** — clean `apps/forwarder/` workspace
- 💾 **Persistent storage** — SQLite DB stores forwarding number and message history (survives restarts)
- 📊 **Message history API** — query forwarded messages and stats via REST endpoints
- 🖥️ **Built-in admin dashboard** — manage forwarding settings and review recent message activity in the browser

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (v18+) |
| Language | TypeScript |
| Framework | Express.js |
| HTTP Client | Axios |
| Logging | Winston |
| Env Management | dotenv |
| Linting | ESLint + Prettier |

---

## 📋 Prerequisites

- Node.js v18 or later
- npm v8 or later
- A [Meta Developer Account](https://developers.facebook.com/)
- A WhatsApp Business App with Cloud API access
- Your **Access Token**, **Phone Number ID** from Meta dashboard

---

## 🚀 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/mmtushar08/Whatsapp-Message-Forwarding-.git
cd Whatsapp-Message-Forwarding-
```

### 2. Install dependencies

```bash
# From repo root (uses npm workspaces)
npm install
```

### 3. Configure environment variables

```bash
cd apps/forwarder
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
FORWARD_TO_NUMBER=1234567890
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
PORT=3000
KEYWORD_FILTERS=          # Optional: e.g. urgent,important
LOG_LEVEL=info
```

### 4. Run in development mode

```bash
cd apps/forwarder
npm run dev
```

### 5. Build for production

```bash
cd apps/forwarder
npm run build
npm start
```

### 6. Open the built-in dashboard

Once the app is running, open:

```bash
http://localhost:3000/
```

Use your `ADMIN_TOKEN` to sign in and manage:
- forwarding number
- keyword filters
- forwarding on/off
- recent message logs and stats

---

## 🌐 Exposing localhost with ngrok (for webhook testing)

Meta requires a publicly accessible HTTPS URL for webhooks. Use [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

Copy the `https://` URL from ngrok output (e.g. `https://abc123.ngrok.io`) and set your webhook URL in the Meta dashboard to:

```
https://abc123.ngrok.io/webhook
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |
| `GET` | `/webhook` | Meta webhook verification handshake |
| `POST` | `/webhook` | Receives incoming WhatsApp messages |
| `GET` | `/` | Built-in admin dashboard |
| `POST` | `/auth/signup` | Create a hosted-product user account |
| `POST` | `/auth/login` | Create a session for a hosted-product user |
| `GET` | `/auth/me` | Read the signed-in user and workspace |
| `PATCH` | `/app/workspace` | Save hosted-product workspace setup |
| `GET` | `/app/workspace` | Read hosted-product workspace setup |
| `GET` | `/config/settings` | Read dashboard settings and endpoint metadata |
| `PATCH` | `/config/settings` | Update forwarding number, filters, and forwarding state |
| `PATCH` | `/config/forward-number` | Update forwarding number at runtime |
| `GET` | `/messages` | Paginated forwarded message history |
| `GET` | `/messages/stats` | Aggregate message statistics |
| `GET` | `/docs` | Swagger UI — interactive API documentation |
| `GET` | `/docs/spec` | OpenAPI JSON spec (for Postman import) |

---

## 📁 Project Structure

```
apps/
  forwarder/
    src/
      index.ts                    # Entry point — starts Express server
      config/
        index.ts                  # Loads and exports env config
      db/
        database.ts               # SQLite init (better-sqlite3)
        configStore.ts            # Persistent config (forward-to number)
        messageStore.ts           # Message history CRUD
      routes/
        webhook.ts                # Webhook routes (GET verify + POST receive)
        messages.ts               # Message history routes
        config.ts                 # Dashboard settings routes
      controllers/
        webhookController.ts      # Handles incoming webhook events
        messagesController.ts     # GET /messages and /messages/stats
        configController.ts       # Dashboard settings and forwarding config
      middleware/
        adminAuth.ts              # Admin token guard for dashboard APIs
      services/
        whatsappService.ts        # Calls WhatsApp Cloud API to forward messages
        filterService.ts          # Keyword/filter logic
        loggerService.ts          # Winston logger setup
      public/
        index.html                # Built-in admin dashboard UI
        dashboard.css             # Dashboard styles
        dashboard.js              # Dashboard client logic
      types/
        whatsapp.ts               # TypeScript types for WhatsApp API payloads
      utils/
        messageParser.ts          # Parses incoming webhook payload
        retry.ts                  # Exponential backoff retry utility
    logs/
      .gitkeep                    # Keeps logs/ folder in git (log files are ignored)
    .env.example                  # Example environment variables (no real secrets)
    package.json
    tsconfig.json
data/
  .gitkeep                        # Keeps data/ folder in git (DB files are ignored)
  forwarder.db                    # SQLite database (auto-created at runtime, not in git)
```

---

## 🔄 Message Forwarding Flow

```
1. Meta sends POST /webhook  →  webhookController receives it
2. messageParser extracts message text + sender number
3. filterService checks if message passes keyword filters (if any configured)
4. If passes → whatsappService.forwardMessage() calls WhatsApp Cloud API
5. loggerService logs: timestamp, sender, message, filter result, forwarding status
```

## 🧭 Product Direction

### Current state

Today, this repository supports a **single managed forwarding deployment**:
- one backend service
- one admin token
- one operator-managed WhatsApp Cloud API setup
- runtime updates for destination number, filters, and pause/resume

### Target state

The next product direction is a **hosted web app** where users:
1. create an account on the website
2. connect their WhatsApp Cloud API details
3. configure source and destination forwarding rules
4. manage forwarding from the web dashboard
5. review logs and webhook status from their browser

This means users will not need to download or self-host the app. They will manage it through a web account instead.

See:
- `docs/WEB_PRODUCT_FLOW.md`
- `docs/MVP_REQUIREMENTS.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## 🛣 Future Roadmap

### Phase 2: Production Readiness

Focus:
- move the hosted product from test mode to a stable customer-ready release

Planned work:
- domain and SSL setup
- HTTPS webhook URL for Meta production use
- better onboarding help for Meta credentials
- connection test flow
- password reset
- email verification
- session and account security improvements
- monitoring and webhook failure alerting
- database backup strategy
- admin support tools
- audit logs

Outcome:
- a safer and easier-to-run hosted MVP

### Phase 3: Product Expansion

Focus:
- add more value for real forwarding use cases while staying narrow

Planned work:
- multiple forwarding rules
- multiple destination numbers
- keyword-based routing
- schedule-based forwarding
- business-hours forwarding
- attachment/media forwarding controls
- fallback forwarding number
- delivery failure notifications
- analytics and reports
- billing and plan limits
- team access for one workspace
- agency or white-label options

Outcome:
- a more commercial and flexible forwarding product without becoming a full inbox platform

### Not Planned For Now

These are intentionally not the priority:
- full chat inbox
- CRM/contact management
- AI chatbot features
- complex automation builder

## 🌐 Hosted Web Prototype

The existing React workspace at `apps/dashboard` is now being repurposed as the hosted product prototype.

Current prototype capabilities:
- landing page
- signup flow
- login flow
- onboarding flow
- browser-managed workspace settings
- prototype logs and webhook setup summary

Current prototype limitation:
- account and workspace data are stored in browser local storage only
- real multi-user backend auth is not implemented yet
- real per-user webhook routing is not implemented yet

Run it locally:

```bash
cd apps/dashboard
npm install
npm run dev
```

Backend foundation now added in `apps/forwarder`:
- user signup/login endpoints
- session-protected workspace endpoints
- SQLite tables for users, sessions, and workspaces

Recommended env additions for this foundation:

```env
APP_ENCRYPTION_KEY=change_this_to_a_long_random_secret
SESSION_TTL_HOURS=24
PUBLIC_APP_URL=https://your-domain.com
```

---

## 🛡️ Security Notes

- Never commit your `.env` file — it is in `.gitignore`
- Log files (`logs/*.log`) are also excluded from git
- All API credentials are loaded from environment variables only

---

## 🧪 Running Tests

The project uses **Jest** + **ts-jest** for unit testing.

```bash
cd apps/forwarder

# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test files live under `apps/forwarder/src/__tests__/` and cover:

| Test File | What it Tests |
|-----------|--------------|
| `filterService.test.ts` | Keyword filter logic |
| `messageParser.test.ts` | Webhook payload parsing |
| `configController.test.ts` | Phone number update + auth |
| `webhookController.test.ts` | Webhook verify + receive endpoints |
| `whatsappService.test.ts` | WhatsApp Cloud API forwarding (mocked axios) |
| `webhookSignature.test.ts` | Signature verification middleware |
| `messageStore.test.ts` | SQLite insert, query, count, and stats |
| `messagesController.test.ts` | Message history API endpoints |

---

## 📊 Message History API

Every forwarded message is stored in a local **SQLite database** (`data/forwarder.db`), which also persists the current forwarding number across server restarts.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/messages` | Paginated message history, newest first |
| `GET` | `/messages/stats` | Aggregate totals: total, success, failed |

### Example: `GET /messages?limit=10&offset=0`

```json
{
  "data": [
    {
      "id": 42,
      "from_number": "15559876543",
      "to_number": "12345678900",
      "message": "Hello!",
      "type": "text",
      "status": "success",
      "error": null,
      "forwarded_at": "2026-03-14T07:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Example: `GET /messages/stats`

```json
{
  "total": 150,
  "success": 145,
  "failed": 5
}
```

> **Note:** The forwarding number set via `PATCH /config/forward-number` is now persisted to SQLite and survives server restarts. On first startup it falls back to the `FORWARD_TO_NUMBER` environment variable.

---

## 🐳 Docker

The app ships with a multi-stage `Dockerfile` and a `docker-compose.yml` for easy deployment.

### Run with Docker Compose

```bash
# 1. Create your .env file first
cd apps/forwarder
cp .env.example .env
# Edit .env with your real credentials

# 2. From the repo root, start the service
docker-compose up --build -d

# 3. Check logs
docker-compose logs -f forwarder
```

### Run with plain Docker

```bash
# Build the image
docker build -f apps/forwarder/Dockerfile -t whatsapp-forwarder .

# Run the container
docker run -d \
  --env-file apps/forwarder/.env \
  -p 3000:3000 \
  --name whatsapp-forwarder \
  whatsapp-forwarder
```

---

## 🧪 Frontend / API Testing

### Option 1: Swagger UI (Recommended)
Once the server is running, visit:
```
http://localhost:3000/docs
```
This opens an interactive API explorer where you can:
- ✅ Test the `/health` endpoint
- ✅ Test `PATCH /config/forward-number` to update the forwarding number
- ✅ Simulate `POST /webhook` payloads (to test message forwarding locally)
- ✅ Import the spec into Postman or Insomnia

### Option 2: Import into Postman
1. Open Postman → Import
2. Enter URL: `http://localhost:3000/docs/spec`
3. Postman will auto-generate a full collection from the OpenAPI spec

### Option 3: cURL Examples

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Update Forwarding Number
```bash
curl -X PATCH http://localhost:3000/config/forward-number \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your_admin_token" \
  -d '{"phoneNumber": "12345678900"}'
```

#### Read Dashboard Settings
```bash
curl http://localhost:3000/config/settings \
  -H "x-admin-token: your_admin_token"
```

#### Update Dashboard Settings
```bash
curl -X PATCH http://localhost:3000/config/settings \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your_admin_token" \
  -d '{"phoneNumber":"12345678900","keywordFilters":"urgent,vip","forwardingEnabled":true}'
```

#### Simulate a WhatsApp Webhook (local testing)
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "display_phone_number": "15551234567", "phone_number_id": "987" },
          "contacts": [{ "profile": { "name": "Test User" }, "wa_id": "15559876543" }],
          "messages": [{
            "from": "15559876543",
            "id": "wamid.test",
            "timestamp": "1710400000",
            "type": "text",
            "text": { "body": "Hello from test!" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

---

## 🔐 Webhook Signature Verification

Meta sends an `X-Hub-Signature-256` header with every webhook POST. The app verifies this signature when `WHATSAPP_APP_SECRET` is configured.

### Setup

Add your **App Secret** (found in Meta App Dashboard → Settings → Basic) to your `.env`:

```env
WHATSAPP_APP_SECRET=your_meta_app_secret_here
```

### Behaviour

| Scenario | Result |
|----------|--------|
| `WHATSAPP_APP_SECRET` not set | Signature check skipped (warning logged) |
| Header missing + secret set | `401 Missing signature header` |
| Header invalid + secret set | `401 Invalid signature` |
| Header valid + secret set | Request proceeds normally |

---

## 🖥️ Built-In Dashboard

The current project ships with a built-in admin dashboard served from the backend itself.

### Access
```bash
http://localhost:3000/
```

### Current dashboard capabilities
- sign in with `ADMIN_TOKEN`
- update forwarding number
- update keyword filters
- pause/resume forwarding
- review message stats
- review recent message logs

### Important limitation

This dashboard is for a **single deployment admin**. It is not yet a multi-user SaaS portal where customers create their own accounts.

That SaaS direction is documented under:
- `docs/WEB_PRODUCT_FLOW.md`
- `docs/MVP_REQUIREMENTS.md`
- `docs/IMPLEMENTATION_ROADMAP.md`


> ⚠️ Setting `WHATSAPP_APP_SECRET` is **strongly recommended** for production to prevent spoofed webhook payloads.
