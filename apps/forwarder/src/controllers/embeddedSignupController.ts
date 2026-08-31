import { Request, Response } from 'express';
import { saveEmbeddedSignupCredentials } from '../db/workspaceStore';
import { completeEmbeddedSignup } from '../services/metaEmbeddedSignupService';
import { deriveBaseUrl } from '../utils/deriveBaseUrl';

export async function completeEmbeddedSignupController(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const { code, phone_number_id, waba_id, business_id } = req.body as {
    code?: string;
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
  };

  if (!code?.trim() || !phone_number_id?.trim() || !waba_id?.trim()) {
    res.status(400).json({ error: 'code, phone_number_id, and waba_id are required' });
    return;
  }

  try {
    const result = await completeEmbeddedSignup({
      code: code.trim(),
      phoneNumberId: phone_number_id.trim(),
      wabaId: waba_id.trim(),
      businessId: business_id?.trim() || undefined,
    });

    const workspace = saveEmbeddedSignupCredentials(req.auth.userId, {
      accessToken: result.accessToken,
      phoneNumberId: result.phoneNumberId,
      wabaId: result.wabaId,
      webhookBaseUrl: deriveBaseUrl(req),
    });

    res.status(200).json({
      success: true,
      workspace,
      waba_id: result.wabaId,
      phone_number_id: result.phoneNumberId,
      business_id: result.businessId,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

/** Legacy endpoint retained for manual/test imports. */
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
    res.status(400).json({ error: 'access_token, phone_number_id, and waba_id are required' });
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
