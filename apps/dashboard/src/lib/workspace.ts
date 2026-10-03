import type { MessageChannel, WorkspaceSettingsInput, WorkspaceSetup } from '../types';

/** True when at least one forwarding destination is configured. */
export function hasDestination(workspace: WorkspaceSetup): boolean {
  return Boolean(
    workspace.forwardToNumber ||
      workspace.extraRecipients.length > 0 ||
      workspace.emailForwardTo ||
      workspace.webhookRelayUrl,
  );
}

/**
 * The full settings payload for a workspace, with overrides applied. The
 * PATCH endpoint replaces every field, so partial edits start from this.
 */
export function workspaceToSettingsInput(
  workspace: WorkspaceSetup,
  overrides: Partial<WorkspaceSettingsInput> = {},
): WorkspaceSettingsInput {
  return {
    businessLabel: workspace.businessLabel,
    sourcePhoneNumber: workspace.sourcePhoneNumber,
    phoneNumberId: workspace.phoneNumberId,
    accessToken: '',
    appSecret: '',
    forwardToNumber: workspace.forwardToNumber,
    extraRecipients: workspace.extraRecipients,
    keywordFilters: workspace.keywordFilters.join(', '),
    forwardingEnabled: workspace.forwardingEnabled,
    webhookRelayUrl: workspace.webhookRelayUrl,
    emailForwardTo: workspace.emailForwardTo,
    forwardTemplateName: workspace.forwardTemplateName,
    forwardTemplateLanguage: workspace.forwardTemplateLanguage,
    ...overrides,
  };
}

export function formatPhone(digits: string): string {
  return digits ? `+${digits}` : '';
}

/** Human label for where a forwarded copy went. */
export function formatDestination(channel: MessageChannel, to: string): string {
  switch (channel) {
    case 'email':
      return `✉️ ${to}`;
    case 'webhook':
      try {
        return `⚙️ ${new URL(to).host}`;
      } catch {
        return `⚙️ ${to}`;
      }
    default:
      return `📱 ${formatPhone(to)}`;
  }
}

export function timeAgo(iso: string): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}
