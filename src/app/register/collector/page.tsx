import { CollectorForm } from "@/components/forms/collector-form";

export const metadata = {
  title: "Register as Collector | CleanCall",
  description: "Register your waste collection business on CleanCall to connect with customers in Ekiti State.",
};

export default function CollectorRegistrationPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Collector Registration</h1>
          <p className="mt-2 text-muted-foreground">
            Register your waste collection business to join the CleanCall marketplace in Ekiti State.
            Fill in your business details below to get started.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="mb-6 text-sm text-muted-foreground">
            Fields marked with <span aria-hidden="true" className="text-red-600">*</span>
            <span className="sr-only">an asterisk</span> are required.
          </p>
          <CollectorForm />
        </div>
      </div>
    </main>
  );
}
