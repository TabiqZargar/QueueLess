import { z } from "zod";
import { queueIdSchema } from "./identifiers";

export const joinQueueSchema = z.object({
  queueId: queueIdSchema,
  name: z
    .string()
    .min(1, "Patient name is required")
    .max(100, "Patient name is too long"),
  phone: z
    .string()
    .min(6, "Enter a valid phone number")
    .max(20, "Phone number is too long"),
});

export type JoinQueueInput = z.infer<typeof joinQueueSchema>;