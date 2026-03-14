# WhatsApp Message Forwarding (Cloud API)

[![CI](https://github.com/mmtushar08/Whatsapp-Message-Forwarding-/actions/workflows/ci.yml/badge.svg)](https://github.com/mmtushar08/Whatsapp-Message-Forwarding-/actions/workflows/ci.yml)

A **production-ready WhatsApp Message Forwarding application** built with **Node.js + TypeScript + Express.js** and the **WhatsApp Cloud API (Meta)**. Automatically forwards incoming WhatsApp messages to a target number, with optional keyword-based filtering.

---

## ✨ Features

- 📨 **Automatic message forwarding** — forwards messages received on your WhatsApp number to any target number
- 🔍 **Optional keyword filtering** — only forward messages matching specific keywords
- 🪝 **Webhook support** — receives messages via Meta's webhook (POST) and handles verification (GET)
- 📝 **Structured logging** — Winston-powered logging to console and `logs/app.log`
- 🔐 **Secure config** — all credentials via `.env` (never hardcoded)
- 🏗️ **Monorepo structure** — clean `apps/forwarder/` workspace

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
| `PATCH` | `/config/forward-number` | Update forwarding number at runtime |
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
      routes/
        webhook.ts                # Webhook routes (GET verify + POST receive)
      controllers/
        webhookController.ts      # Handles incoming webhook events
      services/
        whatsappService.ts        # Calls WhatsApp Cloud API to forward messages
        filterService.ts          # Keyword/filter logic
        loggerService.ts          # Winston logger setup
      types/
        whatsapp.ts               # TypeScript types for WhatsApp API payloads
      utils/
        messageParser.ts          # Parses incoming webhook payload
    logs/
      .gitkeep                    # Keeps logs/ folder in git (log files are ignored)
    .env.example                  # Example environment variables (no real secrets)
    package.json
    tsconfig.json
    .eslintrc.js
    .prettierrc
    nodemon.json
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
  -d '{"phoneNumber": "12345678900", "adminToken": "your_admin_token"}'
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

> ⚠️ Setting `WHATSAPP_APP_SECRET` is **strongly recommended** for production to prevent spoofed webhook payloads.