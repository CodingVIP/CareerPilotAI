type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = tokenProvider ? await tokenProvider() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCloudSnapshot(): Promise<unknown> {
  const response = await fetch('/api/sync/bootstrap', {
    headers: await getAuthHeaders(),
  });
  const body = (await response.json()) as { data?: unknown; error?: string };
  if (!response.ok) {
    throw new Error(body.error || 'Unable to load cloud data.');
  }
  return body.data;
}
