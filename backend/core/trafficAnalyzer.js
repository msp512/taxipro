export function calculateAverageSpeed(distanceMeters, durationSeconds) {

  // validación básica
  if (
    !distanceMeters ||
    !durationSeconds ||
    distanceMeters <= 0 ||
    durationSeconds <= 0
  ) {
    return null; // dato inválido
  }

  const distanceKm = distanceMeters / 1000;
  const durationHours = durationSeconds / 3600;

  let speed = distanceKm / durationHours;

  // ===============================
  // NORMALIZACIÓN (CLAVE)
  // ===============================

  const MIN_SPEED = 5;   // tráfico extremo
  const MAX_SPEED = 120; // límite razonable

  if (speed < MIN_SPEED) speed = MIN_SPEED;
  if (speed > MAX_SPEED) speed = MAX_SPEED;

  return speed;
}