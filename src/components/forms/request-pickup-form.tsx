"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  collectionRequestSchema,
  type CollectionRequestInput,
} from "@/lib/validators/collection-request";
import {
  EKITI_LGAS,
  WASTE_TYPES,
  WILLINGNESS_TO_PAY,
  PRICE_RANGES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCollectionRequest } from "@/lib/actions/create-collection-request";

/**
 * Simple pickup time-of-day slots. Kept as plain human-readable strings so the
 * submitted value is a non-empty string (≤100 chars) that satisfies the
 * `preferred_pickup_time` validator.
 */
const PICKUP_TIME_SLOTS = [
  "Morning (8am-12pm)",
  "Afternoon (12pm-4pm)",
  "Evening (4pm-7pm)",
] as const;

export function RequestPickupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CollectionRequestInput>({
    resolver: zodResolver(collectionRequestSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      pickup_address: "",
      lga: undefined,
      waste_type: undefined,
      estimated_quantity: "",
      bin_bag_count: undefined,
      preferred_pickup_date: "",
      preferred_pickup_time: undefined,
      additional_notes: "",
      willingness_to_pay: undefined,
      price_range: undefined,
    },
  });

  function onSubmit(data: CollectionRequestInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("full_name", data.full_name);
      formData.append("phone", data.phone);
      formData.append("email", data.email || "");
      formData.append("pickup_address", data.pickup_address);
      formData.append("lga", data.lga);
      formData.append("waste_type", data.waste_type);
      formData.append("estimated_quantity", data.estimated_quantity);
      formData.append("preferred_pickup_date", data.preferred_pickup_date);
      formData.append("preferred_pickup_time", data.preferred_pickup_time);

      // Optional fields: only append when the user actually supplied a value,
      // mirroring the customer-form pattern.
      if (data.bin_bag_count !== undefined && data.bin_bag_count !== null) {
        formData.append("bin_bag_count", String(data.bin_bag_count));
      }
      if (data.additional_notes) {
        formData.append("additional_notes", data.additional_notes);
      }
      if (data.willingness_to_pay) {
        formData.append("willingness_to_pay", data.willingness_to_pay);
      }
      if (data.price_range) {
        formData.append("price_range", data.price_range);
      }

      const result = await createCollectionRequest(formData);

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setError(field as keyof CollectionRequestInput, {
              type: "server",
              message,
            });
          });
        } else if (result.error) {
          setError("root", { type: "server", message: result.error });
        }
      } else {
        router.push(
          `/request-pickup/confirmation?rn=${encodeURIComponent(
            result.request_number!
          )}&token=${encodeURIComponent(result.tracking_token!)}`
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {errors.root && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700"
        >
          {errors.root.message}
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">
          Full Name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Enter your full name"
          aria-required="true"
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? "full_name-error" : undefined}
          className={errors.full_name ? "border-red-500" : ""}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p
            id="full_name-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.full_name.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="e.g. 08012345678"
          aria-required="true"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          className={errors.phone ? "border-red-500" : ""}
          {...register("phone")}
        />
        {errors.phone && (
          <p
            id="phone-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Email (optional) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address (optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={errors.email ? "border-red-500" : ""}
          {...register("email")}
        />
        {errors.email && (
          <p
            id="email-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Pickup Address */}
      <div className="space-y-2">
        <Label htmlFor="pickup_address">
          Pickup Address <span aria-hidden="true">*</span>
        </Label>
        <textarea
          id="pickup_address"
          placeholder="Where should we collect the waste?"
          rows={3}
          aria-required="true"
          aria-invalid={!!errors.pickup_address}
          aria-describedby={
            errors.pickup_address ? "pickup_address-error" : undefined
          }
          className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.pickup_address ? "border-red-500" : "border-input"
          }`}
          {...register("pickup_address")}
        />
        {errors.pickup_address && (
          <p
            id="pickup_address-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.pickup_address.message}
          </p>
        )}
      </div>

      {/* LGA */}
      <div className="space-y-2">
        <Label htmlFor="lga">
          Local Government Area <span aria-hidden="true">*</span>
        </Label>
        <select
          id="lga"
          aria-required="true"
          aria-invalid={!!errors.lga}
          aria-describedby={errors.lga ? "lga-error" : undefined}
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.lga ? "border-red-500" : "border-input"
          }`}
          defaultValue=""
          {...register("lga")}
        >
          <option value="" disabled>
            Select your LGA
          </option>
          {EKITI_LGAS.map((lga) => (
            <option key={lga} value={lga}>
              {lga}
            </option>
          ))}
        </select>
        {errors.lga && (
          <p
            id="lga-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.lga.message}
          </p>
        )}
      </div>

      {/* Waste Type */}
      <div className="space-y-2">
        <Label htmlFor="waste_type">
          Waste Type <span aria-hidden="true">*</span>
        </Label>
        <select
          id="waste_type"
          aria-required="true"
          aria-invalid={!!errors.waste_type}
          aria-describedby={errors.waste_type ? "waste_type-error" : undefined}
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.waste_type ? "border-red-500" : "border-input"
          }`}
          defaultValue=""
          {...register("waste_type")}
        >
          <option value="" disabled>
            Select waste type
          </option>
          {WASTE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.waste_type && (
          <p
            id="waste_type-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.waste_type.message}
          </p>
        )}
      </div>

      {/* Estimated Quantity */}
      <div className="space-y-2">
        <Label htmlFor="estimated_quantity">
          Estimated Quantity <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="estimated_quantity"
          type="text"
          placeholder="e.g. 3 bags, 1 truckload"
          aria-required="true"
          aria-invalid={!!errors.estimated_quantity}
          aria-describedby={
            errors.estimated_quantity ? "estimated_quantity-error" : undefined
          }
          className={errors.estimated_quantity ? "border-red-500" : ""}
          {...register("estimated_quantity")}
        />
        {errors.estimated_quantity && (
          <p
            id="estimated_quantity-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.estimated_quantity.message}
          </p>
        )}
      </div>

      {/* Bin/Bag Count (optional) */}
      <div className="space-y-2">
        <Label htmlFor="bin_bag_count">Number of Bins / Bags (optional)</Label>
        <Input
          id="bin_bag_count"
          type="number"
          min={0}
          placeholder="e.g. 5"
          aria-invalid={!!errors.bin_bag_count}
          aria-describedby={
            errors.bin_bag_count ? "bin_bag_count-error" : undefined
          }
          className={errors.bin_bag_count ? "border-red-500" : ""}
          {...register("bin_bag_count")}
        />
        {errors.bin_bag_count && (
          <p
            id="bin_bag_count-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.bin_bag_count.message}
          </p>
        )}
      </div>

      {/* Preferred Pickup Date */}
      <div className="space-y-2">
        <Label htmlFor="preferred_pickup_date">
          Preferred Pickup Date <span aria-hidden="true">*</span>
        </Label>
        <Input
          id="preferred_pickup_date"
          type="date"
          aria-required="true"
          aria-invalid={!!errors.preferred_pickup_date}
          aria-describedby={
            errors.preferred_pickup_date
              ? "preferred_pickup_date-error"
              : undefined
          }
          className={errors.preferred_pickup_date ? "border-red-500" : ""}
          {...register("preferred_pickup_date")}
        />
        {errors.preferred_pickup_date && (
          <p
            id="preferred_pickup_date-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.preferred_pickup_date.message}
          </p>
        )}
      </div>

      {/* Preferred Pickup Time */}
      <div className="space-y-2">
        <Label htmlFor="preferred_pickup_time">
          Preferred Pickup Time <span aria-hidden="true">*</span>
        </Label>
        <select
          id="preferred_pickup_time"
          aria-required="true"
          aria-invalid={!!errors.preferred_pickup_time}
          aria-describedby={
            errors.preferred_pickup_time
              ? "preferred_pickup_time-error"
              : undefined
          }
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.preferred_pickup_time ? "border-red-500" : "border-input"
          }`}
          defaultValue=""
          {...register("preferred_pickup_time")}
        >
          <option value="" disabled>
            Select a preferred time
          </option>
          {PICKUP_TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
        {errors.preferred_pickup_time && (
          <p
            id="preferred_pickup_time-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.preferred_pickup_time.message}
          </p>
        )}
      </div>

      {/* Additional Notes (optional) */}
      <div className="space-y-2">
        <Label htmlFor="additional_notes">Additional Notes (optional)</Label>
        <textarea
          id="additional_notes"
          placeholder="Anything else we should know?"
          rows={3}
          aria-invalid={!!errors.additional_notes}
          aria-describedby={
            errors.additional_notes ? "additional_notes-error" : undefined
          }
          className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.additional_notes ? "border-red-500" : "border-input"
          }`}
          {...register("additional_notes")}
        />
        {errors.additional_notes && (
          <p
            id="additional_notes-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.additional_notes.message}
          </p>
        )}
      </div>

      {/* Photo upload placeholder — deferred to a future phase (Requirement 15) */}
      <div className="space-y-2">
        <Label htmlFor="photo_upload_placeholder">Photo (optional)</Label>
        <input
          id="photo_upload_placeholder"
          type="file"
          accept="image/*"
          disabled
          aria-describedby="photo_upload_placeholder-help"
          className="flex w-full cursor-not-allowed rounded-md border border-input bg-transparent px-3 py-2 text-base text-muted-foreground opacity-50 shadow-sm md:text-sm"
        />
        <p
          id="photo_upload_placeholder-help"
          className="text-xs text-muted-foreground"
        >
          Photo upload is coming in a future phase. You can describe the waste in
          the notes above for now.
        </p>
      </div>

      {/* Optional market-research section (research only — no pricing/payment yet) */}
      <fieldset className="space-y-6 rounded-md border border-input p-4">
        <legend className="px-1 text-sm font-medium">
          Optional: Help us understand demand
        </legend>
        <p className="-mt-2 text-xs text-muted-foreground">
          These questions are optional and for market research only. Pricing and
          payment are future capabilities of CleanCall — nothing here is a quote
          and no payment is taken. You can leave any of them blank.
        </p>

        {/* Willingness to pay */}
        <div className="space-y-2">
          <Label htmlFor="willingness_to_pay">
            Would you be willing to pay for a reliable waste pickup service?
          </Label>
          <select
            id="willingness_to_pay"
            aria-invalid={!!errors.willingness_to_pay}
            aria-describedby={
              errors.willingness_to_pay
                ? "willingness_to_pay-error"
                : undefined
            }
            className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
              errors.willingness_to_pay ? "border-red-500" : "border-input"
            }`}
            defaultValue=""
            {...register("willingness_to_pay")}
          >
            <option value="">Prefer not to say</option>
            {WILLINGNESS_TO_PAY.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.willingness_to_pay && (
            <p
              id="willingness_to_pay-error"
              role="alert"
              aria-live="polite"
              className="text-sm text-red-600"
            >
              {errors.willingness_to_pay.message}
            </p>
          )}
        </div>

        {/* Price range */}
        <div className="space-y-2">
          <Label htmlFor="price_range">
            What would you consider a reasonable amount? (optional)
          </Label>
          <select
            id="price_range"
            aria-invalid={!!errors.price_range}
            aria-describedby="price_range-help"
            className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
              errors.price_range ? "border-red-500" : "border-input"
            }`}
            defaultValue=""
            {...register("price_range")}
          >
            <option value="">Prefer not to say</option>
            {PRICE_RANGES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p id="price_range-help" className="text-xs text-muted-foreground">
            This is a research question to gauge demand, not a quoted price.
          </p>
          {errors.price_range && (
            <p
              id="price_range-error"
              role="alert"
              aria-live="polite"
              className="text-sm text-red-600"
            >
              {errors.price_range.message}
            </p>
          )}
        </div>
      </fieldset>

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
