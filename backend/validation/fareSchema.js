import { z } from "zod";

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
    .min(2, "city too short")
    .max(50, "city too long")
    .optional(),

  // 🔧 AÑADE ESTO
  supplements: z.array(z.string()).optional()

});