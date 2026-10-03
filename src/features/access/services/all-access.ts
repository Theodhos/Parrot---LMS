import "server-only";
import { prisma } from "@/lib/db/client";
import { PaymentStatus } from "@/generated/prisma";
import { ALL_COURSES } from "@/features/access/schemas/access.schema";

export { ALL_COURSES };

/** Whether the user holds a paid, un-refunded purchase that unlocks every course. */
export async function hasAllCourseAccess(userId: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: { userId, status: PaymentStatus.SUCCEEDED, courseSlugs: { has: ALL_COURSES } },
    select: { id: true },
  });
  return payment !== null;
}
