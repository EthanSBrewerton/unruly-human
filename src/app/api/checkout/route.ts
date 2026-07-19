import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  CheckoutInputError,
  buildCheckoutSessionParams,
  getCheckoutSiteOrigin,
  isStripeCheckoutUrl,
  isStripeSecretKeyAllowed,
  parseCheckoutInput,
} from "@/lib/purchase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON with a size." },
      { status: 400 },
    );
  }

  let size;
  try {
    ({ size } = parseCheckoutInput(body));
  } catch (error) {
    if (error instanceof CheckoutInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!isStripeSecretKeyAllowed(stripeSecretKey, process.env.NODE_ENV)) {
    console.error("Checkout configuration error: Stripe credentials are unavailable for this environment.");
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable. Please try again later." },
      { status: 500 },
    );
  }

  let siteOrigin: string;
  try {
    siteOrigin = getCheckoutSiteOrigin({
      environment: process.env.NODE_ENV,
      siteUrl: process.env.SITE_URL,
      requestUrl: request.url,
    });
  } catch (error) {
    console.error("Checkout configuration error:", error);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable. Please try again later." },
      { status: 500 },
    );
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    });
    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams(size, siteOrigin),
    );

    if (!isStripeCheckoutUrl(session.url)) {
      console.error("Stripe checkout error: session did not include a valid checkout URL.");
      return NextResponse.json(
        { error: "Checkout is temporarily unavailable. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 },
    );
  }
}
