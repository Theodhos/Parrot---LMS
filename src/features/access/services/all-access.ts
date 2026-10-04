import "server-only";
import { prisma } from "@/lib/db/client";
import { PaymentStatus } from "@/generated/prisma";
import { ALL_COURSES } from "@/features/access/schemas/access.schema";

export { ALL_COURSES };

/**
 * Whether the user is a buyer: they hold at least one paid, un-refunded
 * purchase. A buyer has every published course open to them -- there is
 * nothing further to buy inside the platform -- whichever product the
 * payment was for and whenever the course was published.
 */
export async function hasAllCourseAccess(userId: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: { userId, status: PaymentStatus.SUCCEEDED },
    select: { id: true },
  });
  return payment !== null;
}
