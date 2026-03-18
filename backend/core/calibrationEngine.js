import { supabase } from "../config/supabase.config.js";
import { isValidService } from "./outlierFilter.js";
export async function calculateCalibration() {

  const { data, error } = await supabase
    .from("services")
    .select("deviation");

  if (error || !data || data.length === 0) {
    return null;
  }

  const totalServices = data.length;

  const sumDeviation = data.reduce(
    (acc, row) => acc + row.deviation,
    0
  );

  const avgDeviation = sumDeviation / totalServices;

  let suggestedFAC = 0.02;

  if (avgDeviation > 1) {
    suggestedFAC = 0.03;
  }

  if (avgDeviation > 2) {
    suggestedFAC = 0.04;
  }

  if (avgDeviation < -1) {
    suggestedFAC = 0.01;
  }

  if (avgDeviation < -2) {
    suggestedFAC = 0.005;
  }

  return {
    totalServices,
    avgDeviation,
    suggestedFAC
  };

}