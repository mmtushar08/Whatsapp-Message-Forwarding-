/**
 * Meta WhatsApp Embedded Signup in the browser.
 *
 * FB.login() opens Meta's popup. Two things come back, in either order:
 *  - the login callback, with a one-time `code` (response_type: 'code')
 *  - a `WA_EMBEDDED_SIGNUP` postMessage from facebook.com with the chosen
 *    WABA ID and phone number ID
 * Both are needed; the backend exchanges the code for a token. The code lives
 * ~30 seconds, so it is sent to the server immediately.
 */

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string | undefined;
const GRAPH_VERSION = (import.meta.env.VITE_META_GRAPH_API_VERSION as string | undefined) || 'v25.0';
const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

/** Exact origins Meta posts Embedded Signup events from. */
const META_ORIGINS = new Set(['https://www.facebook.com', 'https://web.facebook.com']);

export interface EmbeddedSignupResult {
  code: string;
  phoneNumberId: string;
  wabaId: string;
}

export class EmbeddedSignupCancelled extends Error {
  constructor() {
    super('WhatsApp signup was cancelled.');
    this.name = 'EmbeddedSignupCancelled';
  }
}

export function isEmbeddedSignupConfigured(): boolean {
  return Boolean(META_APP_ID && META_CONFIG_ID);
}

let sdkPromise: Promise<void> | null = null;

/** Loads and initialises the Facebook JS SDK once per page. */
export function loadFacebookSdk(): Promise<void> {
  if (!META_APP_ID) {
    return Promise.reject(new Error('Meta signup is not configured (VITE_META_APP_ID is missing).'));
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const init = (): void => {
      window.FB?.init({ appId: META_APP_ID, version: GRAPH_VERSION, cookie: true, xfbml: false });
      resolve();
    };
    if (window.FB) {
      init();
      return;
    }
    window.fbAsyncInit = init;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = SDK_URL;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Could not load Facebook login. Check your connection or ad blocker and try again.'));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

interface SignupMessage {
  type?: string;
  event?: string;
  data?: { phone_number_id?: string; waba_id?: string; error_message?: string; current_step?: string };
}

function parseSignupMessage(event: MessageEvent): SignupMessage | null {
  if (!META_ORIGINS.has(event.origin)) return null;
  try {
    const data = (typeof event.data === 'string' ? JSON.parse(event.data) : event.data) as SignupMessage;
    return data?.type === 'WA_EMBEDDED_SIGNUP' ? data : null;
  } catch {
    return null;
  }
}

/**
 * Runs Embedded Signup and resolves once Meta has returned both the code and
 * the selected number. Rejects with EmbeddedSignupCancelled if the user backs
 * out. Must be called from a click handler so the popup isn't blocked.
 */
export function runEmbeddedSignup(): Promise<EmbeddedSignupResult> {
  if (!window.FB || !META_CONFIG_ID) {
    return Promise.reject(
      new Error('Meta signup is not ready. Refresh the page and try again.'),
    );
  }

  return new Promise<EmbeddedSignupResult>((resolve, reject) => {
    let code: string | null = null;
    let ids: { phoneNumberId: string; wabaId: string } | null = null;
    let settled = false;

    const finish = (error?: Error): void => {
      if (settled) return;
      if (!error && !(code && ids)) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      if (error) reject(error);
      else resolve({ code: code as string, ...(ids as { phoneNumberId: string; wabaId: string }) });
    };

    function onMessage(event: MessageEvent): void {
      const message = parseSignupMessage(event);
      if (!message) return;

      if (message.event === 'CANCEL') {
        finish(new EmbeddedSignupCancelled());
      } else if (message.event === 'ERROR') {
        finish(new Error(message.data?.error_message || 'Meta reported an error during signup.'));
      } else if (message.event === 'FINISH_ONLY_WABA') {
        finish(new Error('No phone number was added. Run the signup again and add a phone number.'));
      } else if (message.event?.startsWith('FINISH')) {
        const { phone_number_id, waba_id } = message.data ?? {};
        if (!phone_number_id || !waba_id) {
          finish(new Error('Meta did not return the selected phone number. Please try again.'));
          return;
        }
        ids = { phoneNumberId: phone_number_id, wabaId: waba_id };
        finish();
      }
    }

    window.addEventListener('message', onMessage);

    window.FB!.login(
      (response) => {
        if (response.authResponse?.code) {
          code = response.authResponse.code;
          finish();
          // The FINISH message normally arrives first; don't wait forever.
          setTimeout(
            () => finish(new Error('Meta did not return the selected phone number. Please try again.')),
            10_000,
          );
          return;
        }
        // Closed without finishing. A FINISH message never arrives in that
        // case, so give a late postMessage a moment before calling it off.
        setTimeout(() => finish(new EmbeddedSignupCancelled()), 1500);
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      },
    );
  });
}
