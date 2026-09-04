import { z } from "zod";

export const joinQueueSchema = z.object({
  queueId: z.string().min(1, "A queue must be selected"),
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