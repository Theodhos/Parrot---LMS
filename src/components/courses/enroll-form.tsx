"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, CreditCard, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enrollInCourseAction } from "@/features/enrollments/actions/enrollment.actions";

export interface EnrollFormProps {
  courseId: string;
  /** Price in cents, USD. 0 means free -- one-click enroll instead of a WooCommerce purchase. */
  priceCents: number;
  /** Absolute WooCommerce checkout URL for this course's product, or null if not linked yet. */
  buyUrl: string | null;
}

/**
 * Free courses enroll with one click. Paid courses link out to checkout on
 * the buyer's WordPress/WooCommerce site -- after payment, its
 * order-received page redirects the buyer straight back here (to
 * /activate, or straight to /login if they already have an account).
 */
export function EnrollForm({ courseId, priceCents, buyUrl }: EnrollFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isPaid = priceCents > 0;

  if (isPaid) {
    if (!buyUrl) {
      return (
        <Button size="lg" disabled className="w-full !rounded-full">
          Not yet available for purchase
        </Button>
      );
    }
    return (
      <Button
        size="lg"
        className="w-full !rounded-full !bg-orange-500 !text-white hover:!bg-orange-600"
        render={
          <a href={buyUrl}>
            <CreditCard />
            {`Buy for $${(priceCents / 100).toFixed(2)}`}
            <ArrowRight />
          </a>
        }
      />
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await enrollInCourseAction(courseId);
      if (!result.success) {
        toast.error(result.error ?? "Could not enroll in this course.");
        return;
      }
      toast.success("You're enrolled! Let's start learning.");
      router.refresh();
    });
  }

  return (
    <Button
      size="lg"
      disabled={isPending}
      onClick={handleClick}
      className="w-full !rounded-full !bg-orange-500 !text-white hover:!bg-orange-600"
    >
      <GraduationCap />
      {isPending ? "Enrolling..." : "Enroll for free"}
      <ArrowRight />
    </Button>
  );
}
