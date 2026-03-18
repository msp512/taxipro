export function isValidService(service) {

  const {
    distance_km,
    duration_min,
    estimated_price,
    meter_price
  } = service;

  if (distance_km < 1) {
    return false;
  }

  if (duration_min < 3) {
    return false;
  }

  const deviation =
    Math.abs(meter_price - estimated_price);

  const deviationPercent =
    deviation / estimated_price;

  if (deviationPercent > 0.15) {
    return false;
  }

  return true;

}