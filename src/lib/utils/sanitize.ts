/**
 * Input sanitization utilities for CleanCall.
 * Prevents XSS by stripping HTML tags and normalizes user input.
 */

/**
 * Sanitizes a string input by stripping HTML tags and trimming whitespace.
 */
export function sanitizeInput(input: string): string {
  // Strip all HTML tags
  const stripped = input.replace(/<[^>]*>/g, "");
  // Trim whitespace
  return stripped.trim();
}

/**
 * Normalizes a phone number by removing spaces, dashes, and parentheses.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

/**
 * Recursively sanitizes all string fields in an object.
 * Non-string values are left unchanged.
 */
export function sanitizeRegistrationData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return sanitizeInput(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRegistrationData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      sanitized[key] = sanitizeRegistrationData(value);
    }
    return sanitized as T;
  }

  return data;
}
