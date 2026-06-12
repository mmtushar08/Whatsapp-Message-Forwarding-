import { Request, Response } from 'express';
import axios from 'axios';

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

interface WabaAccount {
  id: string;
  name: string;
}

interface PhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
}

interface PhoneOption {
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
}

export async function fetchWabaInfo(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { access_token } = req.body as { access_token?: string };
  if (!access_token?.trim()) {
    res.status(400).json({ error: 'access_token is required' });
    return;
  }

  const token = access_token.trim();

  try {
    const wabasRes = await axios.get<{ data: WabaAccount[] }>(
      `${GRAPH_BASE}/me/whatsapp_business_accounts`,
      { params: { access_token: token }, timeout: 10000 },
    );

    const wabas = wabasRes.data.data ?? [];
    if (wabas.length === 0) {
      res.status(404).json({ error: 'No WhatsApp Business Accounts found for this token.' });
      return;
    }

    const phoneArrays = await Promise.all(
      wabas.map(async (waba) => {
        const phonesRes = await axios.get<{ data: PhoneNumber[] }>(
          `${GRAPH_BASE}/${waba.id}/phone_numbers`,
          {
            params: { access_token: token, fields: 'id,display_phone_number,verified_name' },
            timeout: 10000,
          },
        );
        return (phonesRes.data.data ?? []).map<PhoneOption>((phone) => ({
          wabaId: waba.id,
          wabaName: waba.name,
          phoneNumberId: phone.id,
          displayPhoneNumber: phone.display_phone_number,
          verifiedName: phone.verified_name,
        }));
      }),
    );

    const phones = phoneArrays.flat();
    if (phones.length === 0) {
      res.status(404).json({ error: 'No phone numbers found in your WhatsApp Business Accounts.' });
      return;
    }

    res.json({ phones });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const metaError = err.response?.data?.error as { message?: string } | undefined;
      res.status(400).json({ error: metaError?.message ?? 'Failed to fetch WABA info from Meta.' });
      return;
    }
    res.status(500).json({ error: 'Unexpected error contacting Meta.' });
  }
}
