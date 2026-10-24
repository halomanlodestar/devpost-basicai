/** @format */

import { z } from "zod";
import type {
  IngestBody,
  PlanInput,
  StopIdsInput,
  StopSearchInput,
} from "./types";

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

export const StopSearchInputSchema = z.object({
  q: z.string().max(60),
  limit: z.number().int().min(1).max(20).optional(),
}) satisfies z.ZodType<StopSearchInput>;

export const StopIdsInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(10),
}) satisfies z.ZodType<StopIdsInput>;
