/** @format */

import { env } from "./env";

const corsHeaders = {
  "Access-Control-Allow-Origin": env.WEB_ORIGIN,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, trpc-accept",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

// Credentialed CORS for exactly WEB_ORIGIN, including the OPTIONS preflight.
export function withCors(
  handler: (req: Request) => Response | Promise<Response>,
) {
  return async (req: Request) => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders });

    const res = await handler(req);
    const headers = new Headers(res.headers);

    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
