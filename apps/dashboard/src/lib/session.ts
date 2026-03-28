const SESSION_TOKEN_KEY = 'wa-session-token';

export function getSessionToken(): string | null {
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}
