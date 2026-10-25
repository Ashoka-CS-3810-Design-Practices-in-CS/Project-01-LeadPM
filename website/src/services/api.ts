export async function requestJson(path: string, init: RequestInit = {}): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal });
    return { response, data: await response.json() };
  } finally {
    window.clearTimeout(timeout);
  }
}
