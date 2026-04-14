import { z } from "zod";

// Reusable regex constants shared across Zod schemas and standalone field validation
export const PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AADHAAR_REGEX = /^\d{12}$/;
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a form data object against a Zod schema.
 *
 * @param {object} formdata - The form values to validate.
 * @param {z.ZodSchema} zodSchema - The Zod schema to validate against.
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 *   isValid is true when all fields pass; errors maps each failed field
 *   name to its first error message.
 */
const Validation = (formdata, zodSchema) => {
  if (!zodSchema || typeof zodSchema.safeParse !== "function") {
    throw new Error("Validation requires a valid Zod schema");
  }

  const result = zodSchema.safeParse(formdata);

  if (result.success) {
    return { isValid: true, errors: {} };
  }

  // Flatten Zod's nested error structure and take the first message per field
  const fieldErrors = result.error.flatten().fieldErrors;
  const formatted = Object.fromEntries(
    Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]]),
  );

  return { isValid: false, errors: formatted };
};

export default Validation;
