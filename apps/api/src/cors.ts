/** @format */

import { env } from "./env";

const baseHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, trpc-accept",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

/** Credentialed CORS needs one exact origin back: echo the caller's if it's allowed. */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");

  return origin && env.WEB_ORIGIN.includes(origin)
    ? { ...baseHeaders, "Access-Control-Allow-Origin": origin }
    : baseHeaders;
}

// Credentialed CORS for the WEB_ORIGIN list, including the OPTIONS preflight.
export function withCors(
  handler: (req: Request) => Response | Promise<Response>,
) {
  return async (req: Request) => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders(req) });

    const res = await handler(req);
    const headers = new Headers(res.headers);

    for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v);

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
