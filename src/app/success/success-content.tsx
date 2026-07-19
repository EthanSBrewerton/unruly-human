"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type SuccessContentProps = {
  status: "confirmed" | "not-confirmed" | "unavailable";
  reference?: string;
};

export default function SuccessContent({
  status,
  reference,
}: SuccessContentProps) {
  const confirmed = status === "confirmed";
  const unavailable = status === "unavailable";

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-8 rounded-full border border-white/30 flex items-center justify-center"
        >
          {confirmed ? (
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : unavailable ? (
            <span className="text-3xl font-extralight" aria-hidden="true">
              ?
            </span>
          ) : (
            <span className="text-3xl font-extralight" aria-hidden="true">
              !
            </span>
          )}
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-extralight tracking-wide mb-4">
          {confirmed
            ? "Thank You"
            : unavailable
              ? "Verification Unavailable"
              : "Order Not Confirmed"}
        </h1>

        <p className="text-white/60 text-lg mb-8 leading-relaxed">
          {confirmed
            ? "Your payment is confirmed. Your Alloy 000 Bomber Jacket order is recorded with Stripe."
            : unavailable
              ? "Verification could not complete. Your payment may still be recorded with Stripe. Please refresh this page to try verification again."
              : "We couldn't verify a paid order from this link. Check the link and refresh this page to try again."}
        </p>

        {confirmed && (
          <p className="text-white/30 text-sm mb-12">
            Order reference: {reference ?? "—"}
          </p>
        )}

        <Link
          href="/"
          className="inline-block px-8 py-3 border border-white/30 text-sm tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300"
        >
          BACK TO HOME
        </Link>
      </motion.div>
    </main>
  );
}
