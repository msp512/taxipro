import { isValidService } from "./outlierFilter.js";

export async function calculateCalibration() {
  // Supabase desactivado temporalmente.
  // Devolvemos valores neutros para no romper el backend.

  return {
    totalServices: 0,
    avgDeviation: 0,
    suggestedFAC: 0.02
  };
}