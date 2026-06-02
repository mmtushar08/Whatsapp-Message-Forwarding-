import Anthropic from '@anthropic-ai/sdk';
import type { ConversationMessage } from '../db/conversationStore';
import logger from './loggerService';

const DEFAULT_SYSTEM = 'You are a helpful WhatsApp assistant. Reply concisely and conversationally.';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env['ANTHROPIC_API_KEY']);
}

export async function generateReply(
  systemPrompt: string,
  history: ConversationMessage[],
  userMessage: string,
): Promise<string | null> {
  if (!isAiConfigured()) return null;
  try {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt.trim() || DEFAULT_SYSTEM,
      messages,
    });
    const block = msg.content[0];
    return block?.type === 'text' ? block.text : null;
  } catch (e) {
    logger.warn(`AI reply failed: ${(e as Error).message}`);
    return null;
  }
}
