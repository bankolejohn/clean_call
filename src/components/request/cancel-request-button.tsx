'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cancelCollectionRequest } from '@/lib/actions/cancel-collection-request';

interface CancelRequestButtonProps {
  token: string;
}

/**
 * Client control that cancels a collection request via the public tracking
 * token. Requires an explicit confirmation step before invoking the server
 * action (Requirement 7.3), then refreshes the tracking page so the updated
 * status renders.
 */
export function CancelRequestButton({ token }: CancelRequestButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelCollectionRequest(token);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? 'Unable to cancel.');
      }
    });
  }

  return (
    <div className="mt-4">
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Are you sure? This cannot be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={isPending}
            >
              Keep request
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirming(true)}
          disabled={isPending}
        >
          Cancel this request
        </Button>
      )}
    </div>
  );
}
