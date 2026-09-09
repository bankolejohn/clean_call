/**
 * Customer willingness-to-pay options for market-research questions.
 * This is the single source of truth for willingness-to-pay values throughout the application.
 */
export const WILLINGNESS_TO_PAY = [
  'Yes',
  'Maybe - Depends on price',
  'No',
] as const;

export type WillingnessToPay = (typeof WILLINGNESS_TO_PAY)[number];
