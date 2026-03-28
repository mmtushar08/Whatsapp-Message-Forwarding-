# MVP Requirements

## Product Position

Hosted WhatsApp message forwarding service for marketplace or direct web signup.

## Core Use Case

A user signs up on the website, connects their WhatsApp Cloud API credentials, chooses where messages should be forwarded, and manages forwarding from a web dashboard.

## Must-Have Features

- email/password account creation
- login/logout
- one user account owns one forwarding workspace
- store WhatsApp Cloud API credentials per workspace
- store forward-to number per workspace
- store keyword filters per workspace
- enable or disable forwarding per workspace
- show webhook URL and verify token per workspace
- show recent message logs per workspace
- show connection and health status per workspace

## Out of Scope for MVP

- team collaboration
- inbox/chat UI
- CRM features
- AI replies
- billing and subscriptions
- multiple workspaces per user
- advanced routing trees

## Required Data Model

### users
- id
- email
- password_hash
- created_at
- updated_at

### workspaces
- id
- user_id
- name
- created_at
- updated_at

### whatsapp_connections
- id
- workspace_id
- phone_number_id
- access_token_encrypted
- source_number_label
- webhook_verify_token
- app_secret_encrypted
- status
- created_at
- updated_at

### forwarding_settings
- id
- workspace_id
- forward_to_number
- keyword_filters
- forwarding_enabled
- created_at
- updated_at

### message_logs
- id
- workspace_id
- from_number
- to_number
- message
- type
- status
- error
- forwarded_at

## Required Backend Capabilities

- authentication API
- workspace-scoped settings API
- workspace-scoped logs API
- secure credential storage
- webhook routing that maps inbound webhook events to the correct workspace

## Required Frontend Screens

- landing page
- signup page
- login page
- onboarding wizard
- dashboard
- settings page
- logs page

## Migration Note

The current `apps/forwarder` app can continue to serve as the forwarding engine logic, but account management requires a new multi-tenant application layer.
