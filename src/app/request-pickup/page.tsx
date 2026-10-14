import Link from "next/link";
import { RequestPickupForm } from "@/components/forms/request-pickup-form";

export const metadata = {
  title: "Request a Pickup - CleanCall",
  description:
    "Request a waste pickup in Ekiti State. No account needed — submit your details and track your request with a link.",
};

export default function RequestPickupPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          &larr; Back to home
        </Link>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Request a Pickup
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what needs collecting and when. No account required — once you
          submit, we&apos;ll give you a tracking link so you can follow your
          request. Pricing and payment are coming in a future phase; this
          request is free to submit.
        </p>
      </div>

      <RequestPickupForm />
    </main>
  );
}
