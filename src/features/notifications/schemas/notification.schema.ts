import { z } from "zod";
import { NotificationType } from "@/generated/prisma";

export const createNotificationSchema = z.object({
  userId: z.string().length(24),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  type: z.enum(NotificationType).default(NotificationType.INFO),
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
