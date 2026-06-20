import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Registration Successful - CleanCall",
  description: "Your registration has been submitted successfully",
};

export default function CustomerSuccessPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Registration Successful!
      </h1>

      <p className="mt-4 text-muted-foreground">
        Thank you for registering your interest in waste collection services.
        Your details have been captured and you&apos;ll be contacted when services
        become available in your area.
      </p>

      <Button asChild className="mt-8">
        <Link href="/">Back to Homepage</Link>
      </Button>
    </main>
  );
}
