import type { ZodError } from 'zod';
import type { FieldError } from './api.types';

/**
 * Convert a `ZodError` into the flat, field-addressable shape the API returns
 * and the form consumes.
 *
 * This tiny function is the hinge that makes server-side validation useful in
 * the UI: the server emits `details: [{ field, message }]`, and the form does
 *
 *     details.forEach((d) => setError(d.field, { message: d.message }))
 *
 * so a rejection from the server lands under the input that caused it, rather
 * than as a generic red toast.
 *
 * Two details worth knowing:
 *
 * 1. Issues live on `error.issues`. In Zod 3 this was `error.errors`, which in
 *    Zod 4 is `undefined` — silently, not as an error. v3-era code fails quietly.
 * 2. Zod reports every failing check, so one field can yield several issues (an
 *    empty date fails "required" and "format" together). Only the first message
 *    per field is kept: an input shows one message, and three at once is noise.
 */
export function toFieldErrors(error: ZodError): FieldError[] {
  const seen = new Set<string>();
  const fieldErrors: FieldError[] = [];

  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.');

    if (seen.has(field)) {
      continue;
    }

    seen.add(field);
    fieldErrors.push({ field, message: issue.message });
  }

  return fieldErrors;
}
