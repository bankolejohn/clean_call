import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="w-full px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          Get Started Today
        </h2>
        <p className="mt-3 text-center text-base text-muted-foreground sm:text-lg">
          Need a pickup now, or want to join the CleanCall network?
        </p>

        {/* Primary action: request a one-off pickup (no account needed). */}
        <div className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center sm:p-8">
          <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
            Request a Waste Pickup
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-base text-muted-foreground">
            Need waste collected? Submit a pickup request in minutes — no account
            required. You&apos;ll get a tracking link to follow its progress.
          </p>
          <Button asChild size="lg" className="mt-6 w-full text-base sm:w-auto">
            <Link href="/request-pickup">Request a Pickup</Link>
          </Button>
        </div>

        <p className="mt-12 text-center text-base font-medium text-foreground">
          Or register to join the network
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground">
              Customer Registration
            </h3>
            <p className="mt-2 text-base text-muted-foreground">
              Households, businesses, schools, and organizations needing waste
              collection services.
            </p>
            <Button asChild size="lg" className="mt-6 w-full text-base">
              <Link href="/register/customer">Register as Customer</Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground">
              Collector Registration
            </h3>
            <p className="mt-2 text-base text-muted-foreground">
              Waste management companies and private operators providing
              collection services.
            </p>
            <Button asChild size="lg" variant="outline" className="mt-6 w-full text-base">
              <Link href="/register/collector">Register as Collector</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
