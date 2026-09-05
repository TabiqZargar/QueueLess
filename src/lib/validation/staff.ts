import { z } from "zod";

export const addWalkInSchema = z.object({
  queueId: z.string().min(1, "A queue must be selected"),
  name: z.string().trim().min(1, "Patient name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});