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
