import { getHourTrafficFactor } from "./hourTrafficEngine.js";

export function calculateFare({
  baseFare,
  distanceKm,
  priceKm,
  durationMinutes,
  priceMinute,
  dragFactor,
  supplements = 0
}) {

  const hourFactor = getHourTrafficFactor();

  const adjustedDuration = durationMinutes * hourFactor;

  const distanceCost = distanceKm * priceKm;

  const timeCost =
    adjustedDuration * priceMinute * (1 + dragFactor);

  const rawTotal =
    baseFare +
    distanceCost +
    timeCost +
    supplements;

  // redondeo taxímetro
  const roundedTotal = Number(
    (Math.round(rawTotal * 4) / 4).toFixed(2)
  );

  return {
    total: roundedTotal,

    // 🔥 DESGLOSE (CLAVE PARA ANALÍTICA)
    breakdown: {
      baseFare,
      distanceCost,
      timeCost,
      supplements,
      hourFactor,
      dragFactor,
      adjustedDuration
    }
  };
}