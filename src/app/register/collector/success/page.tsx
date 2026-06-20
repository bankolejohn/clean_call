import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Registration Successful | CleanCall",
  description: "Your collector registration has been submitted successfully.",
};

export default function CollectorSuccessPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6" aria-hidden="true">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
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
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Registration Successful!</h1>
        <p className="mt-4 text-muted-foreground">
          Thank you for registering your waste collection business with CleanCall.
          Your details have been submitted and our team will be in touch soon.
        </p>

        <div className="mt-8">
          <Button asChild>
            <Link href="/">Return to Homepage</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
