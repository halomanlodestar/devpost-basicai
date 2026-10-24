/** @format */

import { z } from "zod";
import type { IngestBody, PlanInput } from "./types";

// Runtime validation shared by the API and the web app; shapes live in ./types.

export const PlanInputSchema = z
  .object({ from: z.string().min(1), to: z.string().min(1) })
  .refine(
    (v) => v.from !== v.to,
    "From and To must differ",
  ) satisfies z.ZodType<PlanInput>;

export const IngestBodySchema = z.object({
  events: z
    .array(
      z.object({
        idempotencyKey: z.uuid(),
        stopId: z.string().min(1),
        occurredAt: z.iso.datetime({ offset: true }),
      }),
    )
    .min(1)
    .max(100),
}) satisfies z.ZodType<IngestBody>;
