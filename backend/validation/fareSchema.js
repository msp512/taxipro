import { z } from "zod";

const allowedSupplements = [
  "airport",
  "radio",
  "christmas",
  "pax56",
  "pax78",
  "mountain1",
  "mountain2"
];

export const fareSchema = z.object({
  distance: z
    .number({
      invalid_type_error: "distance must be a number"
    })
    .min(0.5, "distance too small")
    .max(100, "distance too large"),

  duration: z
    .number({
      invalid_type_error: "duration must be a number"
    })
    .min(1, "duration too short")
    .max(180, "duration too long"),

  city: z
    .string()
    .trim()
    .min(2, "city too short")
    .max(50, "city too long")
    .optional(),

  supplements: z
    .array(z.enum(allowedSupplements))
    .max(10, "too many supplements")
    .optional()
});