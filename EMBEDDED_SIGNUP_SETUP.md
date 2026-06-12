# WhatsApp Embedded Signup Setup

This build keeps onboarding focused on one job: connect a WhatsApp Business Account with Meta Embedded Signup and store the returned credentials.

It does not add webhook handling, message sending, chatbot logic, automation, or forwarding rules.

## Folder Structure

```text
apps/
  dashboard/
    src/pages/Onboarding.tsx
    src/pages/Dashboard.tsx
    src/api/client.ts
    .env.example
  forwarder/
    src/controllers/embeddedSignupController.ts
    src/routes/api.ts
    src/db/workspaceStore.ts
    .env.example
```

## Frontend Setup

```bash
cd apps/dashboard
cp .env.example .env
npm run dev -- --host 0.0.0.0 --port 4173
```

Set these values in `apps/dashboard/.env`:

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_META_APP_ID=your_meta_app_id
VITE_META_CONFIG_ID=your_embedded_signup_config_id
```

## Backend Setup

```bash
cd apps/forwarder
cp .env.example .env
npm run build
npm start
```

The backend exposes:

```text
POST /api/save-credentials
```

Request body:

```json
{
  "access_token": "...",
  "phone_number_id": "...",
  "waba_id": "..."
}
```

Response:

```json
{
  "success": true,
  "workspace": {}
}
```

## Meta Setup

1. Open Meta for Developers.
2. Create or open a Business app.
3. Add the WhatsApp product.
4. Copy the App ID into `VITE_META_APP_ID`.
5. In WhatsApp Embedded Signup, create a configuration.
6. Copy that configuration ID into `VITE_META_CONFIG_ID`.
7. Add your local or production domain to the allowed JavaScript SDK domains.
8. Make sure the app has these permissions available:

```text
whatsapp_business_management
whatsapp_business_messaging
```

## Flow

1. User clicks `Connect WhatsApp`.
2. The frontend loads the official Facebook JavaScript SDK.
3. The frontend calls `FB.login()` with the Embedded Signup configuration ID.
4. The frontend listens for Meta `postMessage` events.
5. On `FINISH`, it saves `access_token`, `phone_number_id`, and `waba_id`.
6. The app shows `WhatsApp Connected Successfully`.
