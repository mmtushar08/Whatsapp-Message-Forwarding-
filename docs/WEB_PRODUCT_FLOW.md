# Web Product Flow

## Goal

Move from a single managed forwarding deployment to a hosted web app where users create an account and manage WhatsApp message forwarding from the browser.

This means:
- users should not need to download the app
- users should not need direct server access
- users should manage forwarding through a web account

## End User Flow

1. User opens the hosted website.
2. User creates an account with email and password.
3. User logs in and lands on onboarding.
4. User connects their WhatsApp Cloud API setup.
5. User enters:
   - access token
   - phone number ID
   - source business number label
   - forward-to number
   - optional keyword filters
6. System generates and shows:
   - webhook URL
   - verify token
   - connection instructions
7. User adds webhook details in Meta Developer Dashboard.
8. System verifies the webhook connection.
9. User reaches the dashboard and can:
   - update forward-to number
   - pause or resume forwarding
   - update keyword filters
   - review recent forwarding logs
   - review connection health

## Admin Flow

1. Platform admin reviews users and connections.
2. Platform admin monitors delivery failures.
3. Platform admin can suspend accounts or rotate secrets when needed.

## Single-Tenant Current State

The current repository only supports:
- one deployment
- one admin token
- one backend-managed WhatsApp connection
- one browser dashboard for the deployment owner

It does not yet support per-user accounts.

## Target MVP

The first hosted MVP should support:
- account creation
- login/logout
- one WhatsApp connection per user
- one destination number per user
- optional keyword filters per user
- forwarding pause/resume per user
- recent logs per user
- webhook setup guide per user

## Explicit Product Decision

Instead of asking users to download or self-host the app, the product should be offered as a web-managed service.

That is possible, but it requires:
- authentication
- per-user data storage
- secure secret storage
- multi-tenant webhook routing
- user-facing onboarding
