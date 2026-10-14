"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Inner content that reads useSearchParams. Kept separate so the exported page
 * can wrap it in a <Suspense> boundary, which Next.js requires for
 * useSearchParams to avoid a client-side render bailout during prerender
 * (carried-forward Phase 2 build gotcha).
 */
function ConfirmationInner() {
  const searchParams = useSearchParams();
  const requestNumber = searchParams.get("rn");
  const token = searchParams.get("token");

  // Missing identity params — show a generic, still-reassuring fallback.
  if (!requestNumber || !token) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-md border border-input bg-[#F8F9FA] p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#2E8B57]">
            Request submitted
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your pickup request has been received. If you didn&apos;t save your
            tracking link, you can submit another request below.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" className="w-full">
              <Link href="/request-pickup">Submit another request</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const trackingPath = `/request/track/${token}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#2E8B57] sm:text-3xl">
          Request submitted
        </h1>
        <p className="mt-2 text-muted-foreground">
          Thanks! We&apos;ve received your pickup request and it&apos;s now
          awaiting review.
        </p>
      </div>

      <div className="space-y-6 rounded-md border border-input p-6">
        {/* Request number */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Request Number
          </p>
          <p className="text-lg font-semibold tracking-tight">
            {requestNumber}
          </p>
        </div>

        {/* Current status */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Current Status
          </p>
          <span className="inline-flex items-center rounded-full bg-[#FF6B35]/10 px-3 py-1 text-sm font-medium text-[#FF6B35]">
            Submitted / Pending review
          </span>
        </div>

        {/* Tracking link */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Your tracking link
          </p>
          <p className="text-sm">
            <Link
              href={trackingPath}
              className="font-medium text-[#2E8B57] underline underline-offset-2"
            >
              Track your request
            </Link>
          </p>
          <p className="break-all rounded-md bg-[#F8F9FA] p-3 text-xs text-muted-foreground">
            {trackingPath}
          </p>
          <p className="text-xs text-muted-foreground">
            Please save this link. There is no account, so this link is the only
            way to check on or cancel your request.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild size="lg" className="w-full">
            <Link href={trackingPath}>View request status</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function RequestPickupConfirmationPage() {
  // useSearchParams (read in ConfirmationInner) must sit inside a Suspense
  // boundary so this client page doesn't bail out of prerendering.
  return (
    <Suspense fallback={null}>
      <ConfirmationInner />
    </Suspense>
  );
}
