declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (o: { appId: string; version: string; xfbml?: boolean; cookie?: boolean }) => void;
      login: (cb: (r: { authResponse?: { accessToken?: string; code?: string } }) => void, o: {
        config_id?: string;
        response_type?: string;
        override_default_response_type?: boolean;
        extras?: Record<string, unknown>;
      }) => void;
    };
  }
}

export {};
