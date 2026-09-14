import { ArrowRight, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EnrollFormProps {
  /** Absolute WordPress/WooCommerce checkout URL for this course's product, or null if unpriced yet. */
  buyUrl: string | null;
}

/**
 * There is no free self-enroll path in this app -- course access is only
 * ever granted by a verified WooCommerce purchase (see
 * features/access/services/access.service.ts). This sends the visitor to
 * checkout on the WordPress site; access unlocks automatically once the
 * order completes and its webhook lands.
 */
export function EnrollForm({ buyUrl }: EnrollFormProps) {
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
          <ShoppingCart />
          Buy this course
          <ArrowRight />
        </a>
      }
    />
  );
}
