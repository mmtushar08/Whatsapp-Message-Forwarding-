# WhatsApp Message Forwarding (Cloud API)

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