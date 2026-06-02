import Anthropic from '@anthropic-ai/sdk';
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

export async function generateReply(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!isAiConfigured()) return null;
  try {
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt.trim() || DEFAULT_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = msg.content[0];
    return block?.type === 'text' ? block.text : null;
  } catch (e) {
    logger.warn(`AI auto-reply failed: ${(e as Error).message}`);
    return null;
  }
}
