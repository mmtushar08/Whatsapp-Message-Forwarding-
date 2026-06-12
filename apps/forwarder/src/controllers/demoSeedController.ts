import { Request, Response } from 'express';
import { insertConversationMessage } from '../db/conversationStore';
import { logMessage } from '../db/messageStore';
import { getWorkspaceByUserId } from '../db/workspaceStore';

const SAMPLE_MESSAGES: Array<{ message: string; status: 'success' | 'failed'; error?: string }> = [
  { message: 'Site visit possible this Sunday?', status: 'success' },
  { message: 'Please share brochure for Skyline Towers', status: 'success' },
  { message: 'EMI options for 2BHK?', status: 'success' },
  { message: 'Cancel my appointment', status: 'success' },
  { message: '[Image] floorplan.jpg', status: 'success' },
  { message: 'Wrong number sorry', status: 'failed', error: 'Recipient unreachable (410)' },
];

/**
 * Seeds sample forwarded messages for the caller's workspace.
 * Development-only helper so dashboards have realistic data for demos;
 * disabled in production builds.
 */
export function seedDemoMessages(req: Request, res: Response): void {
  if (process.env['NODE_ENV'] === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const workspace = getWorkspaceByUserId(req.auth.userId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found', onboardingRequired: true });
    return;
  }

  const now = Date.now();
  SAMPLE_MESSAGES.forEach((sample, index) => {
    logMessage({
      workspace_id: workspace.id,
      from_number: `9198${String(76543210 - index * 1111).padStart(8, '0')}`,
      to_number: workspace.forwardToNumber || '919000011122',
      message: sample.message,
      type: 'text',
      status: sample.status,
      error: sample.error,
      forwarded_at: new Date(now - index * 47 * 60 * 1000).toISOString(),
    });
  });

  const conversationCount = seedConversations(workspace.id, now);

  res.status(201).json({
    success: true,
    seeded: SAMPLE_MESSAGES.length,
    conversations: conversationCount,
  });
}

const HOUR = 60 * 60 * 1000;

interface SeedConversation {
  contact: string;
  name: string;
  messages: Array<{ dir: 'in' | 'out'; text: string; agoMs: number }>;
}

// Mirrors the three conversations in the product demo: two with open
// 24h sessions (recent inbound) and one expired (3 days old).
const SEED_CONVERSATIONS: SeedConversation[] = [
  {
    contact: '919987654401',
    name: 'Rahul Verma',
    messages: [
      { dir: 'in', text: 'Hi, is the 2BHK on SG Highway still available?', agoMs: 5 * HOUR },
      { dir: 'in', text: "Also what's the carpet area?", agoMs: 4.8 * HOUR },
      { dir: 'out', text: 'Yes, available! Carpet area is 1,180 sq ft. Want to book a site visit?', agoMs: 4.5 * HOUR },
    ],
  },
  {
    contact: '919771230882',
    name: 'Sneha Patel',
    messages: [
      { dir: 'in', text: 'Please share brochure for Skyline Towers', agoMs: 18 * HOUR },
      { dir: 'out', text: 'Sure Sneha — sending the brochure PDF right here. 📄 skyline-towers.pdf', agoMs: 17.5 * HOUR },
      { dir: 'in', text: 'Got it, thanks! What about EMI options?', agoMs: 17 * HOUR },
    ],
  },
  {
    contact: '919654321774',
    name: 'Amit Shah',
    messages: [
      { dir: 'in', text: 'Cancel my appointment please', agoMs: 72 * HOUR },
      { dir: 'out', text: 'Done, your Tuesday appointment is cancelled. We can reschedule anytime.', agoMs: 71.8 * HOUR },
    ],
  },
];

function seedConversations(workspaceId: string, nowMs: number): number {
  SEED_CONVERSATIONS.forEach((conv) => {
    conv.messages.forEach((msg) => {
      insertConversationMessage({
        workspaceId,
        contactNumber: conv.contact,
        contactName: conv.name,
        direction: msg.dir,
        message: msg.text,
        status: msg.dir === 'in' ? 'received' : 'sent',
        createdAt: new Date(nowMs - msg.agoMs).toISOString(),
      });
    });
  });
  return SEED_CONVERSATIONS.length;
}
