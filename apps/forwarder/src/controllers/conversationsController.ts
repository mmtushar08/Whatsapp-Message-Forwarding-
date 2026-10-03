import { Request, Response } from 'express';
import {
  computeSessionWindow,
  getConversationMessages,
  getConversations,
  getLastInboundAt,
  insertConversationMessage,
} from '../db/conversationStore';
import { getWorkspaceRuntimeByUserId, WorkspaceRuntime } from '../db/workspaceStore';
import { listMessageTemplates, MessageTemplate } from '../services/metaGraphService';
import { sendTemplateMessage, sendTextMessage } from '../services/whatsappService';

type TemplateStatus = 'approved' | 'in_review' | 'rejected' | 'paused' | 'disabled';

/** Meta reports APPROVED / PENDING / REJECTED / PAUSED / DISABLED / IN_APPEAL. */
function normalizeTemplateStatus(status: string): TemplateStatus {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'PAUSED':
      return 'paused';
    case 'DISABLED':
      return 'disabled';
    default:
      return 'in_review';
  }
}

function resolveWorkspace(req: Request): WorkspaceRuntime | null {
  if (!req.auth) return null;
  return getWorkspaceRuntimeByUserId(req.auth.userId);
}

function sendWorkspaceNotFound(res: Response): void {
  res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
}

export function listConversations(req: Request, res: Response): void {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    sendWorkspaceNotFound(res);
    return;
  }
  res.status(200).json({ conversations: getConversations(workspace.id) });
}

export function getThread(req: Request, res: Response): void {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    sendWorkspaceNotFound(res);
    return;
  }

  const contact = req.params['contact'];
  if (!contact) {
    res.status(400).json({ error: 'contact is required' });
    return;
  }

  const messages = getConversationMessages(workspace.id, contact);
  const session = computeSessionWindow(getLastInboundAt(workspace.id, contact));
  res.status(200).json({ messages, session });
}

async function loadTemplates(workspace: WorkspaceRuntime): Promise<MessageTemplate[]> {
  if (!workspace.wabaId) {
    throw new Error(
      'Templates need your WhatsApp Business Account. Reconnect WhatsApp from the Numbers page to load them.',
    );
  }
  return listMessageTemplates(workspace.wabaId, workspace.accessToken);
}

/** GET /app/templates — the WABA's real templates, straight from Meta. */
export async function listTemplates(req: Request, res: Response): Promise<void> {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    sendWorkspaceNotFound(res);
    return;
  }

  try {
    const templates = await loadTemplates(workspace);
    res.status(200).json({
      templates: templates.map((template) => ({
        name: template.name,
        language: template.language,
        category: template.category,
        status: normalizeTemplateStatus(template.status),
        body: template.body,
        variableCount: template.variableCount,
      })),
    });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message, templates: [] });
  }
}

export async function postReply(req: Request, res: Response): Promise<void> {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    sendWorkspaceNotFound(res);
    return;
  }

  const contact = req.params['contact'];
  const { message } = req.body as { message?: string };

  if (!contact || !message?.trim()) {
    res.status(400).json({ error: 'contact and message are required' });
    return;
  }

  const session = computeSessionWindow(getLastInboundAt(workspace.id, contact));
  if (!session.open) {
    res.status(409).json({
      error:
        '24-hour session window closed. Meta requires an approved template to re-open the conversation.',
      sessionClosed: true,
    });
    return;
  }

  try {
    await sendTextMessage(contact, message.trim(), {
      accessToken: workspace.accessToken,
      phoneNumberId: workspace.phoneNumberId,
    });
    const stored = insertConversationMessage({
      workspaceId: workspace.id,
      contactNumber: contact,
      direction: 'out',
      message: message.trim(),
      status: 'sent',
    });
    res.status(201).json({ message: stored, session });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
}

export async function postTemplate(req: Request, res: Response): Promise<void> {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    sendWorkspaceNotFound(res);
    return;
  }

  const contact = req.params['contact'];
  const { templateName, language, parameters } = req.body as {
    templateName?: string;
    language?: string;
    parameters?: unknown;
  };

  if (!contact || !templateName) {
    res.status(400).json({ error: 'contact and templateName are required' });
    return;
  }

  let templates: MessageTemplate[];
  try {
    templates = await loadTemplates(workspace);
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
    return;
  }

  const template = templates.find(
    (t) => t.name === templateName && (!language || t.language === language),
  );
  if (!template) {
    res.status(400).json({ error: `Template "${templateName}" was not found on your account.` });
    return;
  }
  if (normalizeTemplateStatus(template.status) !== 'approved') {
    res.status(400).json({ error: `Template "${template.name}" is not approved yet.` });
    return;
  }

  const values = Array.isArray(parameters) ? parameters.map((p) => String(p).trim()) : [];
  if (values.length < template.variableCount || values.some((value) => !value)) {
    res.status(400).json({
      error: `Template "${template.name}" needs ${template.variableCount} value(s).`,
    });
    return;
  }

  try {
    await sendTemplateMessage(
      contact,
      { name: template.name, language: template.language },
      values.slice(0, template.variableCount),
      { accessToken: workspace.accessToken, phoneNumberId: workspace.phoneNumberId },
    );
    const rendered = template.body.replace(
      /\{\{(\d+)\}\}/g,
      (placeholder, index: string) => values[Number(index) - 1] ?? placeholder,
    );
    const stored = insertConversationMessage({
      workspaceId: workspace.id,
      contactNumber: contact,
      direction: 'out',
      message: rendered,
      type: 'template',
      status: 'sent',
      templateName: template.name,
    });
    res.status(201).json({ message: stored });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
}
