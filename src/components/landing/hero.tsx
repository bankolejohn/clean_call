import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="w-full bg-primary px-4 py-20 sm:px-6 md:py-28 lg:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl md:text-5xl lg:text-6xl">
          Clean Waste Management for Ekiti State
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/90 sm:mt-6 sm:text-lg md:text-xl">
          CleanCall connects households and businesses with reliable waste
          collection services. Register today to help build a cleaner, healthier
          Ekiti.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="w-full text-base sm:w-auto"
          >
            <Link href="/register/customer">I Need Waste Collection</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="w-full text-base sm:w-auto"
          >
            <Link href="/register/collector">I Provide Waste Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
