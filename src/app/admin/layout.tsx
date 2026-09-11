"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAdmin } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type SubView = { href: string; label: string };

type NavLink = {
  href: string;
  label: string;
  subViews?: SubView[];
};

const navLinks: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  {
    href: "/admin/registrations/customers",
    label: "Customers",
    subViews: [
      { href: "/admin/registrations/customers", label: "All" },
      {
        href: "/admin/registrations/customers?interested=true",
        label: "Interested in Service",
      },
      {
        href: "/admin/registrations/customers?existing=yes",
        label: "Existing Collection",
      },
      {
        href: "/admin/registrations/customers?existing=no",
        label: "No Collection",
      },
    ],
  },
  {
    href: "/admin/registrations/collectors",
    label: "Waste Managers",
    subViews: [
      { href: "/admin/registrations/collectors", label: "All Providers" },
      {
        href: "/admin/registrations/collectors?status=Pending",
        label: "Pending Verification",
      },
      {
        href: "/admin/registrations/collectors?status=Active",
        label: "Active",
      },
      {
        href: "/admin/registrations/collectors?status=Suspended",
        label: "Suspended",
      },
    ],
  },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/settings", label: "Settings" },
];

/** True when the current location matches a top-level nav area. */
function isTopLevelActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  return pathname === path || pathname.startsWith(path + "/");
}

/** True when the current location (path + query) matches a sub-view href. */
function isSubViewActive(
  pathname: string,
  currentSearch: string,
  href: string
): boolean {
  const [path, query = ""] = href.split("?");
  if (pathname !== path) {
    return false;
  }
  const target = new URLSearchParams(query);
  const current = new URLSearchParams(currentSearch);
  // "All" / "All Providers" have no query params: active only when the
  // current location also carries none of the sub-view filter params.
  if (query === "") {
    return (
      !current.has("interested") &&
      !current.has("existing") &&
      !current.has("status")
    );
  }
  for (const [key, value] of target.entries()) {
    if (current.get(key) !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Inner chrome that reads usePathname/useSearchParams. Kept separate so the
 * exported layout can wrap it in a <Suspense> boundary, which Next.js requires
 * for useSearchParams to avoid a client-side render bailout during prerender.
 */
function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  // Don't render the admin layout on the login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Determine the active top-level area to decide which sub-views to render.
  const activeArea = navLinks.find((link) =>
    isTopLevelActive(pathname, link.href)
  );
  const subViews = activeArea?.subViews;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="font-bold text-lg">
              CleanCall Admin
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isTopLevelActive(pathname, link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logoutAdmin}>
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </form>
        </div>
        {/* Mobile top-level navigation */}
        <nav className="md:hidden border-t px-4 py-2 flex gap-1 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                isTopLevelActive(pathname, link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {/* Secondary navigation: sub-views for the active area */}
        {subViews && subViews.length > 0 && (
          <nav className="border-t bg-muted/30 px-4 py-2 flex gap-1 overflow-x-auto">
            <div className="container mx-auto flex gap-1">
              {subViews.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                    isSubViewActive(pathname, currentSearch, sub.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AdminChrome>{children}</AdminChrome>
    </Suspense>
  );
}
