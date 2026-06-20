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
          Choose your role and register in minutes.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
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
