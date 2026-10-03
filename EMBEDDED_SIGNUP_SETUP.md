# WhatsApp Embedded Signup Setup

Customers connect their WhatsApp Business number with Meta's official
Embedded Signup popup — no IDs or tokens to copy. This page covers the Meta
configuration and what happens under the hood.

## 1. Meta app configuration

In [developers.facebook.com](https://developers.facebook.com), open (or create)
a **Business** app and add the **WhatsApp** product.

1. **App settings → Basic**: copy the **App ID** and **App Secret**.
2. **WhatsApp → Configuration → Webhook**
   - Callback URL: `https://<backend-domain>/webhook`
   - Verify token: the backend's `WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the **messages** field.

   This is configured once for the whole platform. Each customer's WhatsApp
   Business Account is subscribed to it automatically when they connect.
3. **Facebook Login for Business → Configurations**: create an Embedded Signup
   configuration (WhatsApp Embedded Signup login variation) and copy its
   **Configuration ID**.
4. **Facebook Login for Business → Settings**: add the dashboard domain to
   *Allowed domains for the JavaScript SDK* and the dashboard origin to *Valid
   OAuth Redirect URIs*.
5. Permissions needed (advanced access for real customers, via App Review):
   `whatsapp_business_management`, `whatsapp_business_messaging`.

## 2. Environment variables

Backend (`apps/forwarder/.env`):

```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret      # server only — never put this in the dashboard
META_GRAPH_API_VERSION=v25.0
WEBHOOK_VERIFY_TOKEN=a_long_random_string
```

Dashboard (`apps/dashboard/.env`):

```env
VITE_API_BASE_URL=https://<backend-domain>
VITE_META_APP_ID=your_app_id
VITE_META_CONFIG_ID=your_embedded_signup_configuration_id
```

If `VITE_META_APP_ID` / `VITE_META_CONFIG_ID` are missing, the dashboard says
so and offers the access-token import instead of failing silently.

## 3. What happens when a customer connects

```text
Browser                                  Backend                            Meta Graph API
───────                                  ───────                            ──────────────
FB.login({config_id, response_type:'code'})
  ├─ postMessage WA_EMBEDDED_SIGNUP FINISH
  │    {phone_number_id, waba_id}  (origin checked: www./web.facebook.com)
  └─ callback {authResponse: {code}}
POST /api/complete-embedded-signup ───▶  exchange code ──────────────────▶ GET /oauth/access_token
     {code, phone_number_id, waba_id}    verify number ∈ WABA (with token) ▶ GET /{waba}/phone_numbers
                                         subscribe webhooks ──────────────▶ POST /{waba}/subscribed_apps
                                         register if not on Cloud API ────▶ POST /{phone}/register
                                         create forward_alert template ───▶ POST /{waba}/message_templates
                                         store token encrypted (AES-256-GCM)
```

- The code is single-use and expires in about 30 seconds; it is sent to the
  backend immediately and exchanged there with `META_APP_SECRET`.
- Client-supplied IDs are never trusted alone: the exchanged token must be able
  to list the phone number under the WABA, or the connection is refused.
- A phone number can belong to only one account. Logging in with Meta
  (`POST /auth/meta-login`) uses the same proof and signs into the account that
  owns the verified number, creating one if needed.
- Registration sets a random two-step verification PIN, shown to the owner on
  the **Numbers** page. If the number already has a PIN, registration is
  skipped with a warning the user can act on.

## 4. The 24-hour window and the `forward_alert` template

WhatsApp only allows free-form messages to people who messaged the business
in the last 24 hours. Forwarding to the owner's own phone is usually outside
that window, so forwards fall back to an approved template:

```text
You received a new WhatsApp message from {{1}}:

{{2}}

Reply on WhatsApp to continue the conversation.
```

It is created automatically on connect (category UTILITY). Meta normally
approves it within minutes; the template name can be changed in **Settings**.

## 5. Customers with their own Meta app

**Use an access token** in onboarding accepts a permanent System User token.
The backend lists the numbers that token can reach, verifies the chosen one,
and — when the token belongs to a different Meta app — shows that customer the
callback URL and a per-workspace verify token to put in *their* app, plus asks
for their app secret so their webhooks can be verified. The workspace switches
to **Connected** as soon as Meta verifies the webhook or delivers a message.
