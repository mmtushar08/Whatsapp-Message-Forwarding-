import { getDatabase } from './database';

export interface ForwardingRuleRecord {
  id: number;
  workspace_id: string;
  name: string;
  forward_to_number: string;
  extra_recipients: string;
  keyword_filters: string;
  allowed_senders: string;
  forwarding_enabled: number;
  webhook_relay_url: string;
  email_forward_to: string;
  created_at: string;
  updated_at: string;
}

export interface ForwardingRuleView {
  id: number;
  workspaceId: string;
  name: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string[];
  allowedSenders: string[];
  forwardingEnabled: boolean;
  webhookRelayUrl: string;
  emailForwardTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForwardingRuleInput {
  name: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string[];
  allowedSenders: string[];
  forwardingEnabled: boolean;
  webhookRelayUrl: string;
  emailForwardTo: string;
}

function csv(s: string): string[] {
  return s.split(',').map((v) => v.trim()).filter(Boolean);
}

function toView(record: ForwardingRuleRecord): ForwardingRuleView {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    name: record.name,
    forwardToNumber: record.forward_to_number,
    extraRecipients: csv(record.extra_recipients),
    keywordFilters: csv(record.keyword_filters),
    allowedSenders: csv(record.allowed_senders ?? ''),
    forwardingEnabled: record.forwarding_enabled === 1,
    webhookRelayUrl: record.webhook_relay_url,
    emailForwardTo: record.email_forward_to,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function getRulesForWorkspace(workspaceId: string): ForwardingRuleView[] {
  const db = getDatabase();
  const records = db
    .prepare('SELECT * FROM forwarding_rules WHERE workspace_id = ? ORDER BY id ASC')
    .all(workspaceId) as ForwardingRuleRecord[];
  return records.map(toView);
}

export function getRuleById(id: number, workspaceId: string): ForwardingRuleView | null {
  const db = getDatabase();
  const record = db
    .prepare('SELECT * FROM forwarding_rules WHERE id = ? AND workspace_id = ?')
    .get(id, workspaceId) as ForwardingRuleRecord | undefined;
  return record ? toView(record) : null;
}

export function countRulesForWorkspace(workspaceId: string): number {
  const db = getDatabase();
  const row = db
    .prepare('SELECT COUNT(*) as count FROM forwarding_rules WHERE workspace_id = ?')
    .get(workspaceId) as { count: number };
  return row.count;
}

export function createRule(workspaceId: string, input: ForwardingRuleInput): ForwardingRuleView {
  const db = getDatabase();
  const timestamp = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO forwarding_rules
        (workspace_id, name, forward_to_number, extra_recipients, keyword_filters,
         allowed_senders, forwarding_enabled, webhook_relay_url, email_forward_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      workspaceId,
      input.name,
      input.forwardToNumber,
      input.extraRecipients.join(','),
      input.keywordFilters.join(','),
      input.allowedSenders.join(','),
      input.forwardingEnabled ? 1 : 0,
      input.webhookRelayUrl,
      input.emailForwardTo,
      timestamp,
      timestamp,
    );
  const record = db
    .prepare('SELECT * FROM forwarding_rules WHERE id = ?')
    .get(result.lastInsertRowid) as ForwardingRuleRecord;
  return toView(record);
}

export function updateRule(
  id: number,
  workspaceId: string,
  input: ForwardingRuleInput,
): ForwardingRuleView | null {
  const db = getDatabase();
  const timestamp = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE forwarding_rules SET
        name = ?, forward_to_number = ?, extra_recipients = ?, keyword_filters = ?,
        allowed_senders = ?, forwarding_enabled = ?, webhook_relay_url = ?, email_forward_to = ?, updated_at = ?
       WHERE id = ? AND workspace_id = ?`,
    )
    .run(
      input.name,
      input.forwardToNumber,
      input.extraRecipients.join(','),
      input.keywordFilters.join(','),
      input.allowedSenders.join(','),
      input.forwardingEnabled ? 1 : 0,
      input.webhookRelayUrl,
      input.emailForwardTo,
      timestamp,
      id,
      workspaceId,
    );
  if (result.changes === 0) return null;
  return getRuleById(id, workspaceId);
}

export function deleteRule(id: number, workspaceId: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare('DELETE FROM forwarding_rules WHERE id = ? AND workspace_id = ?')
    .run(id, workspaceId);
  return result.changes > 0;
}
