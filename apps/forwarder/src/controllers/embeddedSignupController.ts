import { Request, Response } from 'express';
import { saveEmbeddedSignupCredentials } from '../db/workspaceStore';
import { deriveBaseUrl } from '../utils/deriveBaseUrl';

export function saveEmbeddedSignup(req: Request, res: Response): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const { access_token, phone_number_id, waba_id } = req.body as {
    access_token?: string;
    phone_number_id?: string;
    waba_id?: string;
  };

  if (!access_token || !phone_number_id || !waba_id) {
    res.status(400).json({
      error: 'access_token, phone_number_id, and waba_id are required',
    });
    return;
  }

  try {
    const workspace = saveEmbeddedSignupCredentials(req.auth.userId, {
      accessToken: access_token,
      phoneNumberId: phone_number_id,
      wabaId: waba_id,
      webhookBaseUrl: deriveBaseUrl(req),
    });

    res.status(200).json({ success: true, workspace });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
