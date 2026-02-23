export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response("ok", { headers: corsHeaders });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch (_err) {
    throw new Error("Invalid JSON body");
  }
}

export function mapErrorToStatusCode(error: unknown): number {
  if (typeof error === "object" && error && "statusCode" in error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode);
    if (!Number.isNaN(statusCode) && statusCode > 0) return statusCode;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("unauthorized")) return 401;
  if (message.includes("forbidden")) return 403;
  if (message.includes("not found")) return 404;
  if (message.includes("bad request") || message.includes("invalid") || message.includes("missing")) return 400;
  if (message.includes("rate limit") || message.includes("quota")) return 429;
  if (message.includes("timeout") || message.includes("timed out")) return 504;
  return 500;
}

export function toErrorPayload(error: unknown): { error: string } {
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: String(error) };
}
