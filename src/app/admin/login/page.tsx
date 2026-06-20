import { LoginForm } from "@/components/forms/login-form";

export const metadata = {
  title: "Admin Login | CleanCall",
  description: "Sign in to the CleanCall admin dashboard",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">CleanCall</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the admin dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
