export function getCookieValue(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function setAuthCookie(token: string, expiresAt: number): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  document.cookie = `auth-token=${token}; Path=/; Max-Age=${maxAge}`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "auth-token=; Path=/; Max-Age=0";
}
