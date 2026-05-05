import { z } from "zod";

const allowedSupplements = [
  // Compatibilidad antigua
  "airport",
  "radio",
  "christmas",
  "mountain1",
  "mountain2",

  // Palma / Tarifa 1-2
  "airport_t12",
  "port_t12",
  "radio_t12",
  "mountain1_t12",
  "mountain2_t12",

  // Interurbana / Tarifa 3-4
  "airport_t34",
  "port_t34",
  "radio_t34",
  "mountain1_t34",
  "mountain2_t34",

  // Especiales
  "holiday_special"
];

const supplementSchema = z.union([
  z.enum(allowedSupplements),
  z.object({
    key: z.enum(allowedSupplements),
    label: z.string().optional(),
    amount: z.union([z.number(), z.string()]).optional()
  })
]);

export const fareSchema = z.preprocess((raw) => {
  const body = raw && typeof raw === "object" ? { ...raw } : {};

  return {
    ...body,

    // Acepta tanto distance/duration como distanceKm/durationMinutes
    distance: Number(body.distance ?? body.distanceKm),
    duration: Number(body.duration ?? body.durationMinutes),

    city: body.city || "Palma",

    supplements: Array.isArray(body.supplements)
      ? body.supplements
      : []
  };
}, z.object({
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
    .array(supplementSchema)
    .max(10, "too many supplements")
    .optional()
}));