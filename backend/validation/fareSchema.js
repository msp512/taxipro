import { z } from "zod";

const supplementSchema = z.union([
  z.string().trim().min(1),
  z.object({
    key: z.string().trim().min(1),
    label: z.string().optional(),
    amount: z.union([z.number(), z.string()]).optional()
  })
]);

export const fareSchema = z.preprocess((raw) => {
  const body = raw && typeof raw === "object" ? { ...raw } : {};

  return {
    ...body,
    distance: Number(body.distance ?? body.distanceKm),
    duration: Number(body.duration ?? body.durationMinutes),
    city: body.city ? String(body.city) : "Palma",
    supplements: Array.isArray(body.supplements) ? body.supplements : []
  };
}, z.object({
  distance: z
    .number({
      invalid_type_error: "distance must be a number"
    })
    .min(0.1, "distance too small")
    .max(150, "distance too large"),

  duration: z
    .number({
      invalid_type_error: "duration must be a number"
    })
    .min(0.5, "duration too short")
    .max(240, "duration too long"),

  city: z
    .string()
    .trim()
    .min(2, "city too short")
    .max(80, "city too long")
    .optional(),

  supplements: z
    .array(supplementSchema)
    .max(20, "too many supplements")
    .optional()
}));