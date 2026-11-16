import Stripe from "stripe";
import { env } from "@/lib/env";

// null until STRIPE_SECRET_KEY is set, so pages can say "payments aren't set
// up" instead of crashing. The SDK pins its own API version.
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;
