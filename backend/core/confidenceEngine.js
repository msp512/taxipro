export function calculateConfidence(distance, duration, speed) {

  let confidence = 90;

  // ===============================
  // DISTANCIA
  // ===============================
  if (distance < 3) confidence -= 5;
  if (distance > 15) confidence -= 4;

  // ===============================
  // DURACIÓN
  // ===============================
  if (duration < 10) confidence -= 5;
  if (duration > 25) confidence -= 3;

  // ===============================
  // VELOCIDAD (CLAVE)
  // ===============================
  if (speed < 10) confidence -= 5;   // tráfico muy denso
  if (speed > 60) confidence -= 5;   // posible autopista / error

  // ===============================
  // LÍMITES
  // ===============================
  return Math.max(70, Math.min(95, confidence));
}