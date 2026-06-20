/**
 * Nigerian phone number validation utility.
 * Supports local format (0XX XXXX XXXX) and international format (+234XX XXXX XXXX).
 */

const LOCAL_PHONE_REGEX = /^0[7-9][01]\d{8}$/;
const INTERNATIONAL_PHONE_REGEX = /^\+234[7-9][01]\d{8}$/;

/**
 * Validates a Nigerian phone number.
 * Strips spaces and dashes before validation.
 * 
 * Valid formats:
 * - Local: 11 digits starting with 0, second digit 7-9, third digit 0-1 (e.g., 07012345678)
 * - International: +234 followed by 10 digits, first digit 7-9, second digit 0-1 (e.g., +2347012345678)
 */
export function isValidNigerianPhone(phone: string): boolean {
  // Strip spaces and dashes before validation
  const cleaned = phone.replace(/[\s\-]/g, "");

  return LOCAL_PHONE_REGEX.test(cleaned) || INTERNATIONAL_PHONE_REGEX.test(cleaned);
}
