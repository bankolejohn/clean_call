import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { displayField } from "@/lib/utils/display";
import { displayEntity } from "@/lib/utils/terminology";
import { StatusControl } from "@/components/admin/status-control";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Collector } from "@/types";

/**
 * Waste Manager profile detail page.
 *
 * A Next.js 15 server component that reads a single `collectors` row directly
 * via the Supabase server client and renders it in distinct sections using the
 * display-only "Waste Manager" terminology. Null field values render as
 * "Not recorded" via `displayField`, and an unknown id triggers `notFound()`.
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.4_
 */
export default async function WasteManagerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collectors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // Unknown id (or no row) → not-found indication (Requirement 11.4).
  if (error || !data) {
    notFound();
  }

  const collector = data as Collector;
  const managerLabel = displayEntity("collector");

  // Format created_at defensively so a malformed/absent value never throws.
  const registeredOn = collector.created_at
    ? new Date(collector.created_at).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      {/* Header + back link */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/registrations/collectors"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            ← Back to {displayEntity("collectors")}
          </Link>
          <h1 className="text-2xl font-bold text-[#343A40]">
            {managerLabel} Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            {displayField(collector.business_name)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2E8B57]">
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Business Name" value={collector.business_name} />
              <Field label="Contact Person" value={collector.contact_person} />
              <Field label="Phone" value={collector.phone} />
              <Field label="Email" value={collector.email} />
              <Field
                label="Business Address"
                value={collector.business_address}
                className="sm:col-span-2"
              />
              <Field label="CAC Number" value={collector.cac_number} />
              <Field label="Registered On" value={registeredOn} />
            </dl>
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2E8B57]">
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field
                label="Service Areas"
                value={collector.service_areas}
                className="sm:col-span-2"
              />
              <Field
                label="Waste Types"
                value={collector.waste_types}
                className="sm:col-span-2"
              />
              <Field label="Staff Count" value={collector.staff_count} />
              <Field label="Vehicle Count" value={collector.vehicle_count} />
              <Field
                label="Years in Operation"
                value={collector.years_in_operation}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Business Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2E8B57]">Business Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 gap-y-4">
              <Field label="Provider Status" value={collector.status} />
            </dl>
            <StatusControl
              entity="collector"
              id={collector.id}
              currentStatus={collector.status ?? "Pending"}
            />
          </CardContent>
        </Card>

        {/* Marketplace Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2E8B57]">
              Marketplace Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-4">
              <Field
                label="Wants More Customers"
                value={collector.wants_more_customers}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * A single labelled field within a profile section. Null/empty values render
 * as "Not recorded" via `displayField` (Requirement 11.2).
 */
function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#343A40]">{displayField(value)}</dd>
    </div>
  );
}
