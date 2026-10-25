/** @format */

import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  /** one origin, or several comma-separated (e.g. the custom domain and a Vercel preview) */
  WEB_ORIGIN: z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  EMITTER_KEY_ENC_KEY: z.string().regex(/^[0-9a-f]{64}$/, "32 bytes, hex"),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  VAPID_SUBJECT: z.string(),
  TZ_SERVICE: z.string().default("Asia/Kolkata"),
  ROLE: z.enum(["all", "api", "worker"]).default("all"),
});

export const env = Env.parse(process.env);
