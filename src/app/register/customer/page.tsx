import { CustomerForm } from "@/components/forms/customer-form";

export const metadata = {
  title: "Customer Registration - CleanCall",
  description:
    "Register your interest in waste collection services in Ekiti State",
};

export default function CustomerRegistrationPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Customer Registration
        </h1>
        <p className="mt-2 text-muted-foreground">
          Register your interest in waste collection services. Fill in the form
          below and we&apos;ll add you to our database for future service delivery in
          Ekiti State.
        </p>
      </div>

      <CustomerForm />
    </main>
  );
}
