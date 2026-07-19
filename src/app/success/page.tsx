import Stripe from "stripe";

import {
  isCheckoutSessionId,
  isPaidUnrulySession,
  isStripeMissingCheckoutSessionError,
  isStripeSecretKeyAllowed,
} from "@/lib/purchase";

import SuccessContent from "./success-content";

export const dynamic = "force-dynamic";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id: providedSessionId } = await searchParams;
  const sessionId =
    typeof providedSessionId === "string" ? providedSessionId : undefined;
  let status: "confirmed" | "not-confirmed" | "unavailable" = "not-confirmed";
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (isCheckoutSessionId(sessionId)) {
    if (!isStripeSecretKeyAllowed(stripeSecretKey, process.env.NODE_ENV)) {
      console.error("Success-page configuration error: Stripe credentials are unavailable for this environment.");
      status = "unavailable";
    } else {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2026-01-28.clover",
        });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        status = isPaidUnrulySession(session, {
          requireLiveMode: process.env.NODE_ENV === "production",
        })
          ? "confirmed"
          : "not-confirmed";
      } catch (error) {
        if (isStripeMissingCheckoutSessionError(error)) {
          status = "not-confirmed";
        } else {
          console.error("Unable to verify Stripe Checkout Session.");
          status = "unavailable";
        }
      }
    }
  }

  return (
    <SuccessContent
      status={status}
      reference={status === "confirmed" ? sessionId?.slice(-8).toUpperCase() : undefined}
    />
  );
}
