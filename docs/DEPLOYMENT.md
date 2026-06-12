# Deployment Guide — Going Live for Meta Submission

Two deployments are required because the app has two halves with different
hosting needs:

| Part | What it is | Where it goes | Why |
|------|-----------|---------------|-----|
| `apps/forwarder` | Express API + webhook receiver + SQLite | **Render** (or Railway/Fly/VPS) | Needs a persistent disk for SQLite and a long-running process for webhooks. **Cannot run on Vercel** — its serverless filesystem is ephemeral, the database would be wiped. |
| `apps/dashboard` | React SPA (Vite) incl. `/privacy` and `/terms` | **Vercel** | Static build, free tier is fine. |

Deploy the backend first — the frontend needs its URL.

## 1. Backend → Render

The repo root contains `render.yaml` (a Render Blueprint).

1. Push the repo to GitHub.
2. In Render: **New + → Blueprint** → select the repo. Render reads
   `render.yaml` and creates the `whatsapp-forwarder` web service with a 1 GB
   persistent disk at `/var/data`.
3. When prompted, fill in:
   - `CORS_ORIGIN` — the dashboard URL. If Vercel isn't deployed yet, use a
     placeholder like `https://example.com` and update it after step 2.
   - `PUBLIC_APP_URL` — the Render service's own URL, e.g.
     `https://whatsapp-forwarder.onrender.com`.
4. After deploy, verify: `https://<service>.onrender.com/health` should return
   `{"status":"ok","db":"ok",...}`.
5. Add optional env vars in the Render dashboard as needed
   (`WHATSAPP_APP_SECRET` is strongly recommended once the Meta app exists —
   it enables webhook signature verification; `SMTP_*` for email forwarding;
   `RAZORPAY_*` for billing).

> **Cost note:** the `starter` plan is required because SQLite needs a
> persistent disk; Render's free tier has no disks and free instances sleep,
> which would also delay webhook delivery. Railway (using
> `apps/forwarder/Dockerfile` plus a volume mounted at `/app/data`) is an
> equivalent alternative.

## 2. Frontend → Vercel

The repo root contains `vercel.json` (builds `apps/dashboard` only).

1. In Vercel: **Add New → Project** → import the repo. The root `vercel.json`
   is picked up automatically; no framework settings needed.
2. In **Project Settings → Environment Variables**, set (these override the
   placeholder in `vercel.json`):
   - `VITE_API_BASE_URL` = the Render backend URL from step 1
   - `VITE_META_APP_ID` = your Meta App ID
   - `VITE_META_CONFIG_ID` = your Embedded Signup configuration ID
3. Deploy, then go back to Render and set `CORS_ORIGIN` to the real Vercel
   URL (no trailing slash), e.g. `https://your-app.vercel.app`.
4. Verify: the dashboard loads, signup/login works, and
   `/privacy` + `/terms` render.

> **Custom domain (recommended before Meta Business Verification):** a free
> `*.vercel.app` subdomain is fine for the privacy/terms URLs and App Review,
> but Business Verification often rejects shared subdomains as the business
> website. Buy a domain, add it to the Vercel project, and use it in all URLs
> below. Remember to update `CORS_ORIGIN` on Render afterwards.

## 3. Meta App Dashboard configuration

In [developers.facebook.com](https://developers.facebook.com) → your app:

**App Settings → Basic**
- Privacy Policy URL: `https://<dashboard-domain>/privacy`
- Terms of Service URL: `https://<dashboard-domain>/terms`
- User data deletion → Data deletion instructions URL:
  `https://<dashboard-domain>/privacy#data-deletion`
- App Domains: the dashboard domain (and custom domain if added)
- Copy the **App Secret** into Render as `WHATSAPP_APP_SECRET`.

**WhatsApp → Configuration**
- Webhook Callback URL: `https://<render-domain>/webhook`
  (per-workspace URLs are generated from `PUBLIC_APP_URL`; the value shown in
  the user's Settings page is the authoritative one)
- Verify Token: the `WEBHOOK_VERIFY_TOKEN` value from Render
  (Environment tab — it was auto-generated)
- Subscribe to the `messages` webhook field.

**Facebook Login for Business → Settings** (for Embedded Signup)
- Allowed Domains for the JavaScript SDK: the dashboard domain
- Valid OAuth Redirect URIs: the dashboard origin

## 4. Submission checklist

- [ ] `https://<render-domain>/health` returns `ok`
- [ ] Dashboard loads over HTTPS; signup → onboarding → settings flow works
- [ ] `/privacy` and `/terms` publicly reachable (open in incognito)
- [ ] Webhook verified in Meta dashboard (green checkmark)
- [ ] Test message to the WhatsApp number gets forwarded end-to-end
- [ ] Business Verification completed (needs custom domain + matching email)
- [ ] Screencast recorded for App Review showing the full user flow
- [ ] Requested permissions: `whatsapp_business_management`,
      `whatsapp_business_messaging`

## Local production-like run (Docker)

```bash
docker compose up --build
```

Forwarder on `http://localhost:3000`, dashboard on `http://localhost:5173`.
SQLite persists in `./data`, logs in `./apps/forwarder/logs`.
