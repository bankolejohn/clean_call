import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logoutAdmin } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your admin session.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            You are currently signed in as{" "}
            <span className="font-medium text-foreground">
              {user?.email ?? "an administrator"}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logoutAdmin}>
            <Button variant="outline" type="submit">
              Logout
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
