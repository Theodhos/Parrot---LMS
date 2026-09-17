import "server-only";
import Stripe from "stripe";

// Lazy singleton -- reading process.env.STRIPE_SECRET_KEY at module load time
// would crash `next build` before the env var is configured (e.g. first
// deploy, before the Marketplace integration is installed).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set -- install the Stripe integration and pull env vars");
    }
    _stripe = new Stripe(secretKey);
  }
  return _stripe;
}
