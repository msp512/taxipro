export function calculateCorrectionFactor(services) {
  if (!services || services.length < 10) {
    // No hay suficientes datos → no tocar nada
    return 1;
  }

  // ==============================
  // 1. FILTRAR OUTLIERS
  // ==============================
  const filtered = services.filter(s => {
    return s.deviation !== null && Math.abs(s.deviation) < 0.25;
  });

  if (filtered.length < 10) return 1;

  // ==============================
  // 2. MEDIA DE DESVIACIÓN
  // ==============================
  const avgDeviation =
    filtered.reduce((sum, s) => sum + s.deviation, 0) / filtered.length;

  // ==============================
  // 3. CONVERTIR A FACTOR
  // ==============================
  let factor = 1 + avgDeviation;

  // ==============================
  // 4. LIMITES DE SEGURIDAD
  // ==============================
  if (factor > 1.08) factor = 1.08;
  if (factor < 0.92) factor = 0.92;

  // ==============================
  // 5. SUAVIZADO (NO CAMBIOS BRUSCOS)
  // ==============================
  const SMOOTHING = 0.3;

  factor = 1 + (factor - 1) * SMOOTHING;

  return Number(factor.toFixed(4));
}