"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayField } from "@/lib/utils/display";
import { isAllowedTransition } from "@/lib/utils/request-status";
import { REQUEST_STATUSES } from "@/lib/constants/request-status";
import type {
  ActivityLogEntry,
  CandidateCollector,
  CollectionRequest,
  RequestStatus,
} from "@/types";

type RequestDetail = CollectionRequest & { activity: ActivityLogEntry[] };

/** Lifecycle steps rendered as a simple status timeline (Requirement 11.1). */
const TIMELINE_STEPS: {
  key: keyof CollectionRequest;
  label: string;
}[] = [
  { key: "created_at", label: "Submitted" },
  { key: "reviewed_at", label: "Under Review" },
  { key: "assigned_at", label: "Assigned" },
  { key: "accepted_at", label: "Accepted" },
  { key: "en_route_at", label: "En Route" },
  { key: "completed_at", label: "Completed" },
  { key: "cancelled_at", label: "Cancelled" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

/** A labelled field row that renders null/empty values as "Not recorded". */
function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{displayField(value)}</span>
    </div>
  );
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assign control state
  const [candidates, setCandidates] = useState<CandidateCollector[]>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [selectedCollectorId, setSelectedCollectorId] = useState("");
  const [manualCollectorId, setManualCollectorId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Status-change control state
  const [targetStatus, setTargetStatus] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  // Notes editor state
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/requests/${id}`);
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load request");
      }
      const result: RequestDetail = await response.json();
      setRequest(result);
      setNotes(result.internal_notes ?? "");
    } catch {
      setError("Failed to load request. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const loadCandidates = useCallback(async () => {
    setAssignError(null);
    try {
      const response = await fetch(`/api/admin/requests/${id}/candidates`);
      if (!response.ok) {
        throw new Error("Failed to load candidates");
      }
      const result: CandidateCollector[] = await response.json();
      setCandidates(result);
      setCandidatesLoaded(true);
    } catch {
      setAssignError("Failed to load suggested Waste Managers.");
    }
  }, [id]);

  const handleAssign = async () => {
    // Candidates are only suggestions (Requirement 10.3): allow either a chosen
    // candidate or a manually entered collector id.
    const collectorId = manualCollectorId.trim() || selectedCollectorId;
    if (!collectorId) {
      setAssignError("Select a suggested Waste Manager or enter a collector ID.");
      return;
    }
    setAssigning(true);
    setAssignError(null);
    try {
      const response = await fetch(`/api/admin/requests/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collector_id: collectorId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAssignError(body?.error || "Assignment failed.");
        return;
      }
      setSelectedCollectorId("");
      setManualCollectorId("");
      await fetchRequest();
    } catch {
      setAssignError("Assignment failed. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async () => {
    if (!request || !targetStatus) return;
    setChangingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch(`/api/admin/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          fromExpected: request.status,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatusError(body?.error || "Status change failed.");
        return;
      }
      setTargetStatus("");
      await fetchRequest();
    } catch {
      setStatusError("Status change failed. Please try again.");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesError(null);
    setNotesSaved(false);
    try {
      const response = await fetch(`/api/admin/requests/${id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: notes }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotesError(body?.error || "Failed to save notes.");
        return;
      }
      setNotesSaved(true);
    } catch {
      setNotesError("Failed to save notes. Please try again.");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading request...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Request not found</h1>
        <p className="text-muted-foreground">
          The request you are looking for does not exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/requests">Back to Collection Requests</Link>
        </Button>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Collection Request</h1>
        <p className="text-destructive">{error || "Request unavailable."}</p>
      </div>
    );
  }

  // Only offer generic transition targets permitted by the table; ASSIGNED is
  // never a generic target (it is reached through the assign operation only).
  const statusOptions = REQUEST_STATUSES.filter(
    (s) => s !== "ASSIGNED" && isAllowedTransition(request.status, s)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{request.request_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge>{request.status}</Badge>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/requests">Back to list</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Full Name" value={request.full_name} />
            <Field label="Phone" value={request.phone} />
            <Field label="Email" value={request.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pickup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Pickup Address" value={request.pickup_address} />
            <Field label="LGA" value={request.lga} />
            <Field label="Waste Type" value={request.waste_type} />
            <Field
              label="Estimated Quantity"
              value={request.estimated_quantity}
            />
            <Field label="Bin/Bag Count" value={request.bin_bag_count} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Preferred Pickup Date"
              value={request.preferred_pickup_date}
            />
            <Field
              label="Preferred Pickup Time"
              value={request.preferred_pickup_time}
            />
            <Field label="Additional Notes" value={request.additional_notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Market</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Willingness to Pay"
              value={request.willingness_to_pay}
            />
            <Field label="Price Range" value={request.price_range} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photo</CardTitle>
          </CardHeader>
          <CardContent>
            {request.photo_url ? (
              <Image
                src={request.photo_url}
                alt={`Photo for request ${request.request_number}`}
                width={480}
                height={320}
                className="max-h-80 w-auto rounded-md border object-contain"
                unoptimized
              />
            ) : (
              <p className="text-sm text-muted-foreground">No photo</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {TIMELINE_STEPS.map((step) => {
                const at = request[step.key] as string | null;
                return (
                  <li
                    key={step.key as string}
                    className="flex items-center justify-between gap-4"
                  >
                    <span
                      className={
                        at
                          ? "text-sm font-medium"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {at ? formatDateTime(at) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Assignment control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            {request.collector_id ? (
              <>
                Assigned to Waste Manager:{" "}
                <span className="font-medium">{request.collector_id}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Awaiting assignment</span>
            )}
          </p>

          {!candidatesLoaded ? (
            <Button variant="outline" size="sm" onClick={loadCandidates}>
              Load suggested Waste Managers
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="w-full sm:w-80">
                <label
                  htmlFor="candidate-select"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Suggested Waste Managers
                </label>
                <Select
                  value={selectedCollectorId}
                  onValueChange={setSelectedCollectorId}
                >
                  <SelectTrigger id="candidate-select" className="mt-1">
                    <SelectValue placeholder="Select a suggestion" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No suggestions available
                      </SelectItem>
                    ) : (
                      candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.business_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-80">
                <label
                  htmlFor="manual-collector-id"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Or enter any collector ID
                </label>
                <input
                  id="manual-collector-id"
                  type="text"
                  value={manualCollectorId}
                  onChange={(e) => setManualCollectorId(e.target.value)}
                  placeholder="collector UUID"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {assignError && (
            <p className="text-sm text-destructive">{assignError}</p>
          )}

          {candidatesLoaded && (
            <Button size="sm" onClick={handleAssign} disabled={assigning}>
              {assigning ? "Assigning..." : "Assign"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Status-change control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No further status changes are available from{" "}
              <span className="font-medium">{request.status}</span>.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-64">
                <label
                  htmlFor="status-select"
                  className="text-xs font-medium text-muted-foreground"
                >
                  New status
                </label>
                <Select
                  value={targetStatus}
                  onValueChange={(v) => setTargetStatus(v)}
                >
                  <SelectTrigger id="status-select" className="mt-1">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleStatusChange}
                disabled={changingStatus || !targetStatus}
              >
                {changingStatus ? "Updating..." : "Update status"}
              </Button>
            </div>
          )}
          {statusError && (
            <p className="text-sm text-destructive">{statusError}</p>
          )}
        </CardContent>
      </Card>

      {/* Internal-notes editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label htmlFor="internal-notes" className="sr-only">
            Internal notes
          </label>
          <textarea
            id="internal-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesSaved(false);
            }}
            rows={5}
            maxLength={5000}
            placeholder="Internal notes (not shown to the public)"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving..." : "Save notes"}
            </Button>
            {notesSaved && (
              <span className="text-sm text-muted-foreground">Saved</span>
            )}
            {notesError && (
              <span className="text-sm text-destructive">{notesError}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          {request.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {request.activity.map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">
                      {entry.action_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entry.description}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
