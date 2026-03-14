import type { MessageStats, MessagesResponse } from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export async function fetchStats(): Promise<MessageStats> {
  const res = await fetch(`${BASE_URL}/messages/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json() as Promise<MessageStats>;
}

export async function fetchMessages(limit: number, offset: number): Promise<MessagesResponse> {
  const res = await fetch(`${BASE_URL}/messages?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.statusText}`);
  return res.json() as Promise<MessagesResponse>;
}

export async function fetchHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json() as Promise<{ status: string; timestamp: string }>;
}

export async function updateForwardNumber(
  phoneNumber: string,
  adminToken: string,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/config/forward-number`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify({ forwardToNumber: phoneNumber }),
  });
  const data = (await res.json()) as { message: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Update failed');
  return data;
}
