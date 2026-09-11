"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  CUSTOMER_STATUSES,
  type CustomerStatus,
} from "@/lib/constants/customer-status";
import {
  PROVIDER_STATUSES,
  type ProviderStatus,
} from "@/lib/constants/provider-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface StatusControlProps {
  /** Which underlying entity this control mutates. */
  entity: "customer" | "collector";
  /** The record id to PATCH. */
  id: string;
  /** The current stored status, used to pre-select the dropdown. */
  currentStatus: string;
}

/** Waste-manager lifecycle actions mapped to the PATCH `action` payload. */
const LIFECYCLE_ACTIONS: ReadonlyArray<{
  action: "approve" | "suspend" | "verify" | "contact";
  label: string;
  variant: "default" | "destructive" | "secondary" | "outline";
}> = [
  { action: "approve", label: "Approve", variant: "default" },
  { action: "verify", label: "Verify", variant: "secondary" },
  { action: "contact", label: "Contact", variant: "outline" },
  { action: "suspend", label: "Suspend", variant: "destructive" },
];

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm sm:w-auto sm:min-w-[12rem]";

/**
 * Shared status-control used on the admin detail pages.
 *
 * - Customer mode renders a labelled dropdown of CUSTOMER_STATUSES; changing the
 *   selection PATCHes /api/admin/customers/{id} with { status }.
 * - Waste-manager mode renders lifecycle action buttons (Approve / Verify /
 *   Contact / Suspend) that PATCH /api/admin/collectors/{id} with { action },
 *   plus a dropdown of PROVIDER_STATUSES that PATCHes with a raw { status }.
 *
 * On a successful (2xx) response the current route is refreshed via
 * router.refresh() so the server component re-fetches the record. A pending
 * state disables the controls and a non-2xx response surfaces a small inline
 * error.
 *
 * _Requirements: 3.3, 5.1, 5.3, 5.4, 5.5, 5.6, 9.3, 11.3, 16.2, 17.1, 17.3_
 */
export function StatusControl({ entity, id, currentStatus }: StatusControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    entity === "customer"
      ? `/api/admin/customers/${id}`
      : `/api/admin/collectors/${id}`;

  function patch(payload: Record<string, string>) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let message = "Could not update status. Please try again.";
          try {
            const data = (await response.json()) as { error?: string };
            if (data?.error) {
              message = data.error;
            }
          } catch {
            // Ignore body parse errors and fall back to the generic message.
          }
          setError(message);
          return;
        }

        // Re-fetch the server component data for the current route.
        router.refresh();
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {entity === "customer" ? (
        <div className="space-y-2">
          <Label htmlFor="customer-status">Lead status</Label>
          <select
            id="customer-status"
            className={selectClassName}
            defaultValue={currentStatus}
            disabled={isPending}
            aria-busy={isPending}
            onChange={(event) => {
              const status = event.target.value as CustomerStatus;
              if (status !== currentStatus) {
                patch({ status });
              }
            }}
          >
            {CUSTOMER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-sm font-medium" id="lifecycle-actions-label">
              Lifecycle actions
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="lifecycle-actions-label"
            >
              {LIFECYCLE_ACTIONS.map(({ action, label, variant }) => (
                <Button
                  key={action}
                  type="button"
                  variant={variant}
                  size="sm"
                  disabled={isPending}
                  aria-busy={isPending}
                  onClick={() => patch({ action })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-status">Set status directly</Label>
            <select
              id="provider-status"
              className={selectClassName}
              defaultValue={currentStatus}
              disabled={isPending}
              aria-busy={isPending}
              onChange={(event) => {
                const status = event.target.value as ProviderStatus;
                if (status !== currentStatus) {
                  patch({ status });
                }
              }}
            >
              {PROVIDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isPending && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Updating…
        </p>
      )}

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
