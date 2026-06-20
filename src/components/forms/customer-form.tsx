"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  customerRegistrationSchema,
  type CustomerRegistrationInput,
} from "@/lib/validators/customer";
import {
  EKITI_LGAS,
  CUSTOMER_CATEGORIES,
  DISPOSAL_METHODS,
  COLLECTION_FREQUENCIES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerCustomer } from "@/lib/actions/register-customer";

export function CustomerForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerRegistrationInput>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      address: "",
      lga: undefined,
      category: undefined,
      disposal_method: undefined,
      collection_frequency: undefined,
    },
  });

  function onSubmit(data: CustomerRegistrationInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("full_name", data.full_name);
      formData.append("phone", data.phone);
      formData.append("email", data.email || "");
      formData.append("address", data.address);
      formData.append("lga", data.lga);
      formData.append("category", data.category);
      formData.append("disposal_method", data.disposal_method);
      formData.append("collection_frequency", data.collection_frequency);

      const result = await registerCustomer(formData);

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            setError(field as keyof CustomerRegistrationInput, {
              type: "server",
              message,
            });
          });
        } else if (result.error) {
          setError("root", { type: "server", message: result.error });
        }
      } else {
        router.push("/register/customer/success");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
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

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Address <span aria-hidden="true">*</span>
        </Label>
        <textarea
          id="address"
          placeholder="Enter your address"
          rows={3}
          aria-required="true"
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "address-error" : undefined}
          className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.address ? "border-red-500" : "border-input"
          }`}
          {...register("address")}
        />
        {errors.address && (
          <p
            id="address-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.address.message}
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

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">
          Category <span aria-hidden="true">*</span>
        </Label>
        <select
          id="category"
          aria-required="true"
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? "category-error" : undefined}
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.category ? "border-red-500" : "border-input"
          }`}
          defaultValue=""
          {...register("category")}
        >
          <option value="" disabled>
            Select your category
          </option>
          {CUSTOMER_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && (
          <p
            id="category-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.category.message}
          </p>
        )}
      </div>

      {/* Disposal Method */}
      <div className="space-y-2">
        <Label htmlFor="disposal_method">
          Current Waste Disposal Method <span aria-hidden="true">*</span>
        </Label>
        <select
          id="disposal_method"
          aria-required="true"
          aria-invalid={!!errors.disposal_method}
          aria-describedby={
            errors.disposal_method ? "disposal_method-error" : undefined
          }
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.disposal_method ? "border-red-500" : "border-input"
          }`}
          defaultValue=""
          {...register("disposal_method")}
        >
          <option value="" disabled>
            Select disposal method
          </option>
          {DISPOSAL_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        {errors.disposal_method && (
          <p
            id="disposal_method-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.disposal_method.message}
          </p>
        )}
      </div>

      {/* Collection Frequency */}
      <div className="space-y-2">
        <Label htmlFor="collection_frequency">
          Waste Collection Frequency Needed <span aria-hidden="true">*</span>
        </Label>
        <select
          id="collection_frequency"
          aria-required="true"
          aria-invalid={!!errors.collection_frequency}
          aria-describedby={
            errors.collection_frequency
              ? "collection_frequency-error"
              : undefined
          }
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${
            errors.collection_frequency ? "border-red-500" : "border-input"
          }`}
          defaultValue=""
          {...register("collection_frequency")}
        >
          <option value="" disabled>
            Select collection frequency
          </option>
          {COLLECTION_FREQUENCIES.map((freq) => (
            <option key={freq} value={freq}>
              {freq}
            </option>
          ))}
        </select>
        {errors.collection_frequency && (
          <p
            id="collection_frequency-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.collection_frequency.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isPending}
      >
        {isPending ? "Submitting..." : "Register"}
      </Button>
    </form>
  );
}
