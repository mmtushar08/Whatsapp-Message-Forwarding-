import { Request, Response } from 'express';
import {
  computeSessionWindow,
  getConversationMessages,
  getConversations,
  getLastInboundAt,
  insertConversationMessage,
} from '../db/conversationStore';
import { getWorkspaceByUserId, getWorkspaceRuntimeByPhoneNumberId } from '../db/workspaceStore';
import { sendTextMessage } from '../services/whatsappService';
import logger from '../services/loggerService';

/**
 * Static template catalog for now. A production version would sync these from
 * the Graph API message_templates edge once the WABA has approved templates.
 */
const TEMPLATES = [
  {
    name: 'follow_up_v2',
    status: 'approved',
    body: 'Hi {{1}}, following up on your enquiry about {{2}}. Are you still interested? Reply YES to continue.',
  },
  {
    name: 'site_visit_slot',
    status: 'approved',
    body: "Hi {{1}}, slots for a site visit are open this weekend. Reply with a preferred time and we'll confirm.",
  },
  {
    name: 'payment_reminder',
    status: 'in_review',
    body: 'Hi {{1}}, a gentle reminder about your pending booking amount of {{2}}.',
  },
];

function resolveWorkspace(req: Request): { id: string } | null {
  if (!req.auth) return null;
  return getWorkspaceByUserId(req.auth.userId);
}

export function listConversations(req: Request, res: Response): void {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }
  res.status(200).json({ conversations: getConversations(workspace.id) });
}

export function getThread(req: Request, res: Response): void {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
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

export function listTemplates(_req: Request, res: Response): void {
  res.status(200).json({ templates: TEMPLATES });
}

async function deliverOutbound(
  userId: string,
  contact: string,
  text: string,
): Promise<'sent' | 'simulated'> {
  const workspaceView = getWorkspaceByUserId(userId);
  const runtime = workspaceView
    ? getWorkspaceRuntimeByPhoneNumberId(workspaceView.phoneNumberId)
    : null;

  if (!runtime) {
    throw new Error('Workspace credentials not found');
  }

  try {
    await sendTextMessage(contact, text, {
      accessToken: runtime.accessToken,
      phoneNumberId: runtime.phoneNumberId,
    });
    return 'sent';
  } catch (error) {
    // Demo/test credentials can't reach the Graph API. Outside production we
    // record the message as simulated so the product flow stays usable.
    if (process.env['NODE_ENV'] !== 'production') {
      logger.warn(`Cloud API send failed in dev — storing as simulated: ${(error as Error).message}`);
      return 'simulated';
    }
    throw error;
  }
}

export async function postReply(req: Request, res: Response): Promise<void> {
  const workspace = resolveWorkspace(req);
  if (!workspace || !req.auth) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
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
    const status = await deliverOutbound(req.auth.userId, contact, message.trim());
    const stored = insertConversationMessage({
      workspaceId: workspace.id,
      contactNumber: contact,
      direction: 'out',
      message: message.trim(),
      status,
    });
    res.status(201).json({ message: stored, session });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
}

export async function postTemplate(req: Request, res: Response): Promise<void> {
  const workspace = resolveWorkspace(req);
  if (!workspace || !req.auth) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const contact = req.params['contact'];
  const { templateName } = req.body as { templateName?: string };
  const template = TEMPLATES.find((t) => t.name === templateName);

  if (!contact || !template) {
    res.status(400).json({ error: 'contact and a valid templateName are required' });
    return;
  }
  if (template.status !== 'approved') {
    res.status(400).json({ error: `Template "${template.name}" is not approved yet.` });
    return;
  }

  try {
    const text = `📋 Template · ${template.name} — "${template.body}"`;
    const status = await deliverOutbound(req.auth.userId, contact, text);
    const stored = insertConversationMessage({
      workspaceId: workspace.id,
      contactNumber: contact,
      direction: 'out',
      message: text,
      status,
      templateName: template.name,
    });
    res.status(201).json({ message: stored });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
}
