import { Request, Response } from 'express';
import {
  discoverWabaIds,
  getWabaName,
  listWabaPhoneNumbers,
  MetaApiError,
} from '../services/metaGraphService';

interface PhoneOption {
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
}

/**
 * POST /api/fetch-waba-info
 * Lists every phone number a pasted access token can reach, so users pick a
 * number instead of copying IDs out of Meta's dashboard.
 */
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
    const wabaIds = await discoverWabaIds(token);
    if (wabaIds.length === 0) {
      res.status(404).json({ error: 'No WhatsApp Business Accounts found for this token.' });
      return;
    }

    const phoneArrays = await Promise.all(
      wabaIds.map(async (wabaId) => {
        const [wabaName, phones] = await Promise.all([
          getWabaName(wabaId, token),
          listWabaPhoneNumbers(wabaId, token),
        ]);
        return phones.map<PhoneOption>((phone) => ({
          wabaId,
          wabaName,
          phoneNumberId: phone.id,
          displayPhoneNumber: phone.displayPhoneNumber,
          verifiedName: phone.verifiedName,
        }));
      }),
    );

    const phones = phoneArrays.flat();
    if (phones.length === 0) {
      res.status(404).json({ error: 'No phone numbers found in your WhatsApp Business Accounts.' });
      return;
    }

    res.json({ phones });
  } catch (error) {
    const message =
      error instanceof MetaApiError ? error.message : 'Unexpected error contacting Meta.';
    res.status(error instanceof MetaApiError ? 400 : 500).json({ error: message });
  }
}
