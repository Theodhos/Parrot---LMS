import { z } from "zod";
import { MediaType } from "@/generated/prisma";

export const createMediaSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z.string().min(1),
  type: z.enum(MediaType),
  size: z.number().int().min(0),
});
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
