# WhatsApp Embedded Signup Setup

This build uses Meta's real Embedded Signup flow for Sendo.cloud. The browser receives the short-lived authorization code plus WABA/phone identifiers; the code is immediately sent to the backend and exchanged with Meta using the app secret. The business token is never exposed to the browser.

## Folder Structure

```text
apps/
  dashboard/
    src/pages/Onboarding.tsx
    src/api/client.ts
    src/types/facebook.d.ts
    .env.example
  forwarder/
    src/controllers/embeddedSignupController.ts
    src/services/metaEmbeddedSignupService.ts
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

Set:

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_META_APP_ID=your_meta_app_id
VITE_META_CONFIG_ID=your_embedded_signup_config_id
```

Never put `META_APP_SECRET` in the dashboard environment or any `VITE_*` variable.

## Backend Setup

Set these server-only variables:

```text
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_GRAPH_API_VERSION=v22.0
```

Then:

```bash
cd apps/forwarder
cp .env.example .env
npm run build
npm start
```

## API

Production onboarding uses:

```text
POST /api/complete-embedded-signup
Authorization: Bearer <Sendo session token>
```

Request:

```json
{
  "code": "META_EXCHANGEABLE_CODE",
  "phone_number_id": "123456789",
  "waba_id": "987654321",
  "business_id": "optional_business_id"
}
```

The server:

1. Exchanges the authorization code at Meta's `/oauth/access_token` endpoint.
2. Receives the customer-scoped business token.
3. Subscribes the app to the customer's WABA at `/{waba_id}/subscribed_apps`.
4. Encrypts the business token and stores it against the authenticated Sendo workspace.

The old `POST /api/save-credentials` endpoint remains only for manual/test imports.

## Meta App Configuration

1. Use the Meta app approved for your Tech Provider integration.
2. Enable Facebook Login for Business.
3. Create/use a WhatsApp Embedded Signup configuration and copy its Config ID.
4. Enable Login with the JavaScript SDK, Web OAuth Login, Client OAuth Login, Embedded Browser OAuth Login, Strict Mode for redirect URIs, and HTTPS as required by your Meta configuration.
5. Add every actual Sendo.cloud dashboard hostname used for onboarding to Meta's allowed domains and exact OAuth redirect configuration.
6. Make sure the configuration has the required WhatsApp permissions, including:

```text
whatsapp_business_management
whatsapp_business_messaging
```

Use Advanced Access where Meta requires it for real customer onboarding.

## Flow

```text
Customer clicks Connect with Meta
        ↓
FB.login(config_id, response_type=code)
        ↓
Meta Embedded Signup popup
        ↓
WA_EMBEDDED_SIGNUP FINISH postMessage
        ↓
WABA ID + phone number ID
        ↓
FB.login callback → exchangeable code
        ↓
POST /api/complete-embedded-signup
        ↓
Backend exchanges code using META_APP_SECRET
        ↓
Customer business token
        ↓
Subscribe app to WABA
        ↓
Encrypt + store token in workspace
```

The `postMessage` and `FB.login` callback can arrive in either order, so the dashboard waits until it has both the code and the WABA/phone IDs before completing onboarding.

## Important Production Notes

- Do not log the authorization code or business token.
- Exchange the code immediately because it is short-lived.
- Keep the business token server-side and encrypted at rest.
- Test with a Meta account that is not an administrator/developer of the app before production launch.
- Confirm your app's webhook subscription and WABA event handling before enabling customer messaging.
