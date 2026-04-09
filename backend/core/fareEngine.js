export function calculateFare({
  baseFare,
  distanceKm,
  priceKm,
  durationMinutes,
  priceMinute,
  dragFactor = 0,
  supplements = 0
}) {
  const distanceCost = distanceKm * priceKm;
  const timeCost = durationMinutes * priceMinute;

  const rawTotal =
    baseFare +
    distanceCost +
    timeCost +
    supplements;

  const roundedTotal = Number(
    (Math.round(rawTotal * 4) / 4).toFixed(2)
  );

  return {
    total: roundedTotal,
    breakdown: {
      baseFare,
      distanceCost,
      timeCost,
      supplements,
      hourFactor: 1,
      dragFactor: 0,
      adjustedDuration: durationMinutes
    }
  };
}