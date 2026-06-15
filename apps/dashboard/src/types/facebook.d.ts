declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (o: { appId: string; version: string; xfbml?: boolean; cookie?: boolean }) => void;
      login: (cb: (r: { authResponse?: { accessToken?: string } }) => void, o: object) => void;
    };
  }
}

export {};
