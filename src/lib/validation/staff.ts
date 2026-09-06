import { z } from "zod";
import { queueIdSchema } from "./identifiers";

export const addWalkInSchema = z.object({
  queueId: queueIdSchema,
  name: z.string().trim().min(1, "Patient name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});