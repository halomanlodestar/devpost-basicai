import { z } from "zod";

// Shared by the API and the web app. Filled in slice by slice.
export const StopId = z.string().min(1);
