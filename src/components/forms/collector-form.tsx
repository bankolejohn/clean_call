"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { collectorRegistrationSchema, type CollectorRegistrationInput } from "@/lib/validators/collector";
import { EKITI_LGAS } from "@/lib/constants/lgas";
import { WANTS_MORE_CUSTOMERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerCollector } from "@/lib/actions/register-collector";

const WASTE_TYPES = [
  "General Waste",
  "Recyclables",
  "Organic Waste",
  "Hazardous Waste",
  "Medical Waste",
  "E-Waste",
  "Construction Waste",
] as const;

export function CollectorForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CollectorRegistrationInput>({
    resolver: zodResolver(collectorRegistrationSchema),
    defaultValues: {
      business_name: "",
      contact_person: "",
      phone: "",
      email: "",
      business_address: "",
      service_areas: [],
      waste_types: [],
      staff_count: undefined as unknown as number,
      vehicle_count: undefined as unknown as number,
      years_in_operation: undefined as unknown as number,
      cac_number: "",
    },
  });

  const selectedServiceAreas = watch("service_areas") || [];
  const selectedWasteTypes = watch("waste_types") || [];

  function handleServiceAreaChange(lga: string, checked: boolean) {
    const current = selectedServiceAreas;
    if (checked) {
      setValue("service_areas", [...current, lga as (typeof EKITI_LGAS)[number]], { shouldValidate: true });
    } else {
      setValue("service_areas", current.filter((a) => a !== lga), { shouldValidate: true });
    }
  }

  function handleWasteTypeChange(type: string, checked: boolean) {
    const current = selectedWasteTypes;
    if (checked) {
      setValue("waste_types", [...current, type], { shouldValidate: true });
    } else {
      setValue("waste_types", current.filter((t) => t !== type), { shouldValidate: true });
    }
  }

  async function onSubmit(data: CollectorRegistrationInput) {
    setIsSubmitting(true);
    setServerError(null);

    const formData = new FormData();
    formData.append("business_name", data.business_name);
    formData.append("contact_person", data.contact_person);
    formData.append("phone", data.phone);
    formData.append("email", data.email);
    formData.append("business_address", data.business_address);
    formData.append("staff_count", String(data.staff_count));
    formData.append("vehicle_count", String(data.vehicle_count));
    formData.append("years_in_operation", String(data.years_in_operation));
    if (data.cac_number) {
      formData.append("cac_number", data.cac_number);
    }
    data.service_areas.forEach((area) => formData.append("service_areas", area));
    data.waste_types.forEach((type) => formData.append("waste_types", type));
    // Phase 2 optional market-research field: only append when answered.
    if (data.wants_more_customers) {
      formData.append("wants_more_customers", data.wants_more_customers);
    }

    const result = await registerCollector(formData);

    if (result.success) {
      router.push("/register/collector/success");
    } else {
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CollectorRegistrationInput, { message });
        });
      }
      if (result.error) {
        setServerError(result.error);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {serverError}
        </div>
      )}

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="business_name">
          Business Name <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="business_name"
          type="text"
          maxLength={150}
          aria-required="true"
          aria-invalid={!!errors.business_name}
          aria-describedby={errors.business_name ? "business_name-error" : undefined}
          {...register("business_name")}
        />
        {errors.business_name && (
          <p id="business_name-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.business_name.message}
          </p>
        )}
      </div>

      {/* Contact Person */}
      <div className="space-y-2">
        <Label htmlFor="contact_person">
          Contact Person <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="contact_person"
          type="text"
          maxLength={100}
          aria-required="true"
          aria-invalid={!!errors.contact_person}
          aria-describedby={errors.contact_person ? "contact_person-error" : undefined}
          {...register("contact_person")}
        />
        {errors.contact_person && (
          <p id="contact_person-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.contact_person.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="e.g. 08012345678 or +2348012345678"
          aria-required="true"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          {...register("phone")}
        />
        {errors.phone && (
          <p id="phone-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.phone.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="email"
          type="email"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.email.message}
          </p>
        )}
      </div>

      {/* Business Address */}
      <div className="space-y-2">
        <Label htmlFor="business_address">
          Business Address <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <textarea
          id="business_address"
          maxLength={300}
          rows={3}
          aria-required="true"
          aria-invalid={!!errors.business_address}
          aria-describedby={errors.business_address ? "business_address-error" : undefined}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          {...register("business_address")}
        />
        {errors.business_address && (
          <p id="business_address-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.business_address.message}
          </p>
        )}
      </div>

      {/* Service Areas (Multi-select checkboxes) */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">
          Service Areas (LGAs) <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required, select at least one)</span>
        </legend>
        <p className="text-xs text-muted-foreground">Select the Local Government Areas you serve</p>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3"
          role="group"
          aria-labelledby="service_areas-label"
          aria-describedby={errors.service_areas ? "service_areas-error" : undefined}
        >
          {EKITI_LGAS.map((lga) => (
            <label key={lga} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                value={lga}
                checked={selectedServiceAreas.includes(lga)}
                onChange={(e) => handleServiceAreaChange(lga, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {lga}
            </label>
          ))}
        </div>
        {errors.service_areas && (
          <p id="service_areas-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.service_areas.message}
          </p>
        )}
      </fieldset>

      {/* Waste Types (Multi-select checkboxes) */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">
          Waste Types Handled <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required, select at least one)</span>
        </legend>
        <p className="text-xs text-muted-foreground">Select the types of waste your business handles</p>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          role="group"
          aria-describedby={errors.waste_types ? "waste_types-error" : undefined}
        >
          {WASTE_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                value={type}
                checked={selectedWasteTypes.includes(type)}
                onChange={(e) => handleWasteTypeChange(type, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {type}
            </label>
          ))}
        </div>
        {errors.waste_types && (
          <p id="waste_types-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.waste_types.message}
          </p>
        )}
      </fieldset>

      {/* Staff Count */}
      <div className="space-y-2">
        <Label htmlFor="staff_count">
          Number of Staff <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="staff_count"
          type="number"
          min={1}
          max={10000}
          aria-required="true"
          aria-invalid={!!errors.staff_count}
          aria-describedby={errors.staff_count ? "staff_count-error" : undefined}
          {...register("staff_count", { valueAsNumber: true })}
        />
        {errors.staff_count && (
          <p id="staff_count-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.staff_count.message}
          </p>
        )}
      </div>

      {/* Vehicle Count */}
      <div className="space-y-2">
        <Label htmlFor="vehicle_count">
          Number of Vehicles <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="vehicle_count"
          type="number"
          min={1}
          max={10000}
          aria-required="true"
          aria-invalid={!!errors.vehicle_count}
          aria-describedby={errors.vehicle_count ? "vehicle_count-error" : undefined}
          {...register("vehicle_count", { valueAsNumber: true })}
        />
        {errors.vehicle_count && (
          <p id="vehicle_count-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.vehicle_count.message}
          </p>
        )}
      </div>

      {/* Years in Operation */}
      <div className="space-y-2">
        <Label htmlFor="years_in_operation">
          Years in Operation <span aria-hidden="true" className="text-red-600">*</span>
          <span className="sr-only">(required)</span>
        </Label>
        <Input
          id="years_in_operation"
          type="number"
          min={0}
          max={100}
          aria-required="true"
          aria-invalid={!!errors.years_in_operation}
          aria-describedby={errors.years_in_operation ? "years_in_operation-error" : undefined}
          {...register("years_in_operation", { valueAsNumber: true })}
        />
        {errors.years_in_operation && (
          <p id="years_in_operation-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.years_in_operation.message}
          </p>
        )}
      </div>

      {/* CAC Number (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="cac_number">
          CAC Registration Number <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="cac_number"
          type="text"
          maxLength={20}
          aria-invalid={!!errors.cac_number}
          aria-describedby={errors.cac_number ? "cac_number-error" : undefined}
          {...register("cac_number")}
        />
        {errors.cac_number && (
          <p id="cac_number-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.cac_number.message}
          </p>
        )}
      </div>

      {/* Wants More Customers (Optional Phase 2 market-research field) */}
      <div className="space-y-2">
        <Label htmlFor="wants_more_customers">
          Would you be interested in getting more customers through CleanCall?{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <select
          id="wants_more_customers"
          aria-invalid={!!errors.wants_more_customers}
          aria-describedby={errors.wants_more_customers ? "wants_more_customers-error" : undefined}
          defaultValue=""
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.wants_more_customers ? "border-red-500" : "border-input"
          }`}
          {...register("wants_more_customers")}
        >
          <option value="">Prefer not to say</option>
          {WANTS_MORE_CUSTOMERS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.wants_more_customers && (
          <p id="wants_more_customers-error" role="alert" aria-live="polite" className="text-sm text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {errors.wants_more_customers.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Register as Collector"}
      </Button>
    </form>
  );
}
