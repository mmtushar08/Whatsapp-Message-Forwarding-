# End-to-end check

Drives every user flow in a real browser against the production build:

```bash
tools/e2e/run.sh            # CHROME_PATH=/path/to/chrome if Chromium isn't auto-detected
```

Meta is faked at the network layer, so no Meta app or phone is needed:

- `mock-meta.js` — a stateful Graph API on `:4010` that behaves like Meta where
  it matters: single-use signup codes, tokens scoped to their own WhatsApp
  account, free-form messages refused outside the 24-hour window (`131047`),
  templates that must exist and be approved.
- `e2e.js` — routes `connect.facebook.net` and `www.facebook.com` to a fake SDK
  and signup popup, then walks through signup, Meta connect, the first rule,
  inbound webhooks and forwarding (including the template fallback), logs,
  inbox replies and templates, pause/resume, filters, numbers, billing, Meta
  login, multi-tenant routing, security negatives, own-app token import and the
  mobile layout.

Screenshots and logs land in `tools/e2e/.tmp/`. The backend runs with
`NODE_ENV=production`, so signature checks and URL safety rules are the real ones.

## Real WhatsApp test (live Meta API)

`real-meta-test.js` uses no mocks: it sends a real `hello_world` template to
your phone, then connects the number through the product, saves a rule that
forwards to your phone, and delivers a signed inbound webhook as if a customer
had written to the business number.

1. In your Meta app → **WhatsApp → API Setup**, copy the temporary access token,
   the *Phone number ID* and the *WhatsApp Business Account ID*.
2. Under **To**, add your WhatsApp number and enter the code WhatsApp sends you
   (test numbers can only message verified recipients).
3. Optional: send "hi" from your phone to the test number, so plain-text
   forwards are allowed for 24 hours. Otherwise forwards use the
   `forward_alert` template, which Meta has to approve first.
4. Build the backend once (`cd apps/forwarder && npm run build`) and run:

```bash
WA_TOKEN=... WA_PHONE_NUMBER_ID=... WA_WABA_ID=... TEST_TO=91XXXXXXXXXX \
  node tools/e2e/real-meta-test.js
```

`TEST_TO` needs the country code (India: `91` + 10 digits). Each failure prints
Meta's error and what to do about it. The test database is deleted afterwards.
