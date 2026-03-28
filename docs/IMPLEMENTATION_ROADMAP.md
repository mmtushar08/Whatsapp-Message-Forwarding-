# Implementation Roadmap

## Phase 0: Current Foundation

Already available in this repository:
- forwarding engine
- webhook receiver
- runtime settings
- message logs
- single-admin dashboard

## Phase 1: Web Account Foundation

Goal: allow users to create an account and manage forwarding from the web.

Required work:
- choose auth approach
- add users table
- add workspaces table
- add session or token auth
- add signup/login endpoints
- add protected web pages

Deliverable:
- users can create an account and sign in

## Phase 2: Production Readiness

Goal: make the hosted product stable, secure, and ready for real customer onboarding.

Primary outcomes:
- move from local/IP testing to a real production URL
- reduce setup confusion for non-technical users
- improve security and supportability

Required work:
- add domain and SSL for the dashboard and webhook URL
- switch `PUBLIC_APP_URL` to the final HTTPS domain
- add onboarding help for Meta setup
- add a "test connection" flow for WhatsApp credentials
- improve dashboard validation and error states
- add password reset flow
- add email verification flow
- add session management improvements
- add workspace-level rate limits
- add audit logs for settings changes
- add backup and restore plan for database and secrets
- add monitoring and alerting for webhook failures
- add admin support view for customer troubleshooting

Deliverable:
- a secure and supportable hosted MVP that customers can actually use

## Phase 3: Product Expansion

Goal: add higher-value forwarding features without turning the app into a full chat platform.

Primary outcomes:
- make the forwarding product more useful for real business scenarios
- improve retention with practical advanced controls
- prepare for commercial growth

Required work:
- support multiple forwarding rules per workspace
- support multiple destination numbers
- add keyword-based routing to different numbers
- add schedule-based forwarding
- add pause windows and business-hour rules
- add media and attachment forwarding controls
- add fallback destination number support
- add delivery retry controls and failure notifications
- add usage analytics and forwarding reports
- add workspace plan limits
- add billing and subscription support
- add teammate access for one workspace
- add white-label or agency-friendly options

Deliverable:
- a stronger commercial product with advanced forwarding controls and monetization support

## Later / Optional Direction

Only build these if the market clearly asks for them:
- public API for customer integrations
- templates for common routing setups
- CRM-style contact organization
- advanced automation builder
- inbox or conversation UI
- AI-based message processing

Recommendation:
- keep the product focused on forwarding first
- avoid expanding into a full `respond.io` style platform too early

## Recommended Technical Direction

- keep `apps/forwarder` as the forwarding engine reference
- add a new web app for account management
- move from single-deployment config to database-backed per-user config
- keep secrets server-side and never expose them in the client
