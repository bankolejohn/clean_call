import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createElement } from "react";

// Mock next/navigation (same setup as components.test.tsx)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock server actions
vi.mock("@/lib/actions/register-customer", () => ({
  registerCustomer: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/actions/register-collector", () => ({
  registerCollector: vi.fn().mockResolvedValue({ success: true }),
}));

import { CustomerForm } from "@/components/forms/customer-form";
import { CollectorForm } from "@/components/forms/collector-form";

// The task file uses the .ts extension, so components are rendered via
// createElement to avoid JSX in a non-tsx file.
describe("CustomerForm — Phase 2 optional market-research fields", () => {
  it("renders the willingness_to_pay optional field with its label", () => {
    render(createElement(CustomerForm));
    expect(
      screen.getByLabelText(/would you be willing to pay/i)
    ).toBeInTheDocument();
  });

  it("renders the preferred_price_range optional field with its label", () => {
    render(createElement(CustomerForm));
    expect(
      screen.getByLabelText(/what would you consider a reasonable monthly amount/i)
    ).toBeInTheDocument();
  });

  it("renders the has_existing_collection optional field with its label", () => {
    render(createElement(CustomerForm));
    expect(
      screen.getByLabelText(/do you currently have someone\/company collecting your waste/i)
    ).toBeInTheDocument();
  });

  it("does not show the satisfaction field initially (has_existing_collection defaults to blank)", () => {
    render(createElement(CustomerForm));
    expect(
      screen.queryByLabelText(
        /are you satisfied with your current waste collection service/i
      )
    ).not.toBeInTheDocument();
  });

  it("shows the satisfaction field after selecting has_existing_collection = 'Yes'", async () => {
    render(createElement(CustomerForm));

    const existingCollection = screen.getByLabelText(
      /do you currently have someone\/company collecting your waste/i
    );
    fireEvent.change(existingCollection, { target: { value: "Yes" } });

    const satisfaction = await screen.findByLabelText(
      /are you satisfied with your current waste collection service/i
    );
    expect(satisfaction).toBeInTheDocument();
  });

  it("hides the satisfaction field again when has_existing_collection is changed away from 'Yes'", async () => {
    render(createElement(CustomerForm));

    const existingCollection = screen.getByLabelText(
      /do you currently have someone\/company collecting your waste/i
    );

    fireEvent.change(existingCollection, { target: { value: "Yes" } });
    await screen.findByLabelText(
      /are you satisfied with your current waste collection service/i
    );

    fireEvent.change(existingCollection, { target: { value: "No" } });
    await waitFor(() => {
      expect(
        screen.queryByLabelText(
          /are you satisfied with your current waste collection service/i
        )
      ).not.toBeInTheDocument();
    });
  });

  it("does not mark the new market-research fields as aria-required", () => {
    render(createElement(CustomerForm));

    expect(
      screen.getByLabelText(/would you be willing to pay/i)
    ).not.toHaveAttribute("aria-required", "true");
    expect(
      screen.getByLabelText(/what would you consider a reasonable monthly amount/i)
    ).not.toHaveAttribute("aria-required", "true");
    expect(
      screen.getByLabelText(/do you currently have someone\/company collecting your waste/i)
    ).not.toHaveAttribute("aria-required", "true");
  });

  it("marks the satisfaction field as optional (not aria-required) once shown", async () => {
    render(createElement(CustomerForm));

    fireEvent.change(
      screen.getByLabelText(
        /do you currently have someone\/company collecting your waste/i
      ),
      { target: { value: "Yes" } }
    );

    const satisfaction = await screen.findByLabelText(
      /are you satisfied with your current waste collection service/i
    );
    expect(satisfaction).not.toHaveAttribute("aria-required", "true");
  });
});

describe("CollectorForm — Phase 2 optional field", () => {
  it("renders the wants_more_customers optional field with its label", () => {
    render(createElement(CollectorForm));
    expect(
      screen.getByLabelText(
        /would you be interested in getting more customers through cleancall/i
      )
    ).toBeInTheDocument();
  });

  it("does not mark the wants_more_customers field as aria-required", () => {
    render(createElement(CollectorForm));
    expect(
      screen.getByLabelText(
        /would you be interested in getting more customers through cleancall/i
      )
    ).not.toHaveAttribute("aria-required", "true");
  });
});
