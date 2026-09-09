import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { StatusControl } from "@/components/admin/status-control";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayField } from "@/lib/utils/display";
import type { Customer } from "@/types";

interface CustomerDetailPageProps {
  // Next.js 15: dynamic route params are provided as a Promise.
  params: Promise<{ id: string }>;
}

/** Formats an ISO timestamp for display, falling back to "Not recorded". */
function formatDate(value: string | null | undefined): string {
  if (!value) {
    return displayField(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return displayField(value);
  }
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** A single labelled field row using the null-safe display helper. */
function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{displayField(value)}</dd>
    </div>
  );
}

/**
 * Customer profile detail page (Requirements 9.1, 9.2, 9.3, 9.4).
 *
 * Server Component: reads the customer row directly via the server Supabase
 * client for a clean initial render, then embeds the client `StatusControl`
 * for lead-status mutations. Unknown ids render the not-found UI (Req 9.4);
 * null field values render "Not recorded" via `displayField` (Req 9.2);
 * information is grouped into distinct sections (Req 9.1).
 */
export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // Unknown id (or a fetch that returned no row) → not-found indication.
  if (error || !data) {
    notFound();
  }

  const customer = data as Customer;
  const currentStatus = customer.status ?? "New";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/registrations/customers"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            ← Back to customers
          </Link>
          <h1 className="text-2xl font-bold">
            {displayField(customer.full_name)}
          </h1>
        </div>
        <Badge variant="secondary" className="w-fit">
          {currentStatus}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" value={customer.full_name} />
              <Field label="Phone" value={customer.phone} />
              <Field label="Email" value={customer.email} />
              <Field
                label="Registration date"
                value={formatDate(customer.created_at)}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Address" value={customer.address} />
              <Field label="LGA" value={customer.lga} />
              <Field label="State" value="Ekiti State" />
            </dl>
          </CardContent>
        </Card>

        {/* Waste Information */}
        <Card>
          <CardHeader>
            <CardTitle>Waste Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" value={customer.category} />
              <Field
                label="Disposal method"
                value={customer.disposal_method}
              />
              <Field
                label="Collection frequency"
                value={customer.collection_frequency}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Current Arrangement */}
        <Card>
          <CardHeader>
            <CardTitle>Current Arrangement</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Has existing collection"
                value={customer.has_existing_collection}
              />
              <Field
                label="Satisfaction with existing"
                value={customer.satisfaction_with_existing}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Market Interest */}
        <Card>
          <CardHeader>
            <CardTitle>Market Interest</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Willingness to pay"
                value={customer.willingness_to_pay}
              />
              <Field
                label="Preferred price range"
                value={customer.preferred_price_range}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Current status" value={currentStatus} />
            <StatusControl
              entity="customer"
              id={customer.id}
              currentStatus={currentStatus}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
