import type { Context } from "hono";

export function jsonError(context: Context, status: 400 | 401 | 404 | 500, message: string) {
  return context.json({ error: message }, status);
}

export async function readJsonBody<T extends Record<string, unknown>>(context: Context): Promise<T> {
  try {
    return (await context.req.json()) as T;
  } catch {
    return {} as T;
  }
}
