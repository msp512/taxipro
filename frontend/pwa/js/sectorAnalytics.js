/* ===============================
   TAXIPRO SECTOR ANALYTICS v1.0
   =============================== */

function computeSectorMetrics() {

  const services = getValidServicesLast90Days();

  if (services.length === 0) {
    return {
      totalValid: 0,
      status: "no_data"
    };
  }

  let deviations = [];
  let withinTolerance = 0;
  let positiveDeviation = 0;
  let negativeDeviation = 0;

  services.forEach(service => {

    const deviation =
      (service.real_total - service.estimated_total) /
      service.estimated_total;

    deviations.push(deviation);

    if (Math.abs(deviation) <= 0.03) {
      withinTolerance++;
    }

    if (deviation > 0) positiveDeviation++;
    if (deviation < 0) negativeDeviation++;
  });

  const mean =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  const variance =
    deviations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0)
    / deviations.length;

  const stdDeviation = Math.sqrt(variance);

  return {
    totalValid: services.length,
    withinTolerancePercent:
      ((withinTolerance / services.length) * 100).toFixed(1),

    positiveDeviationPercent:
      ((positiveDeviation / services.length) * 100).toFixed(1),

    negativeDeviationPercent:
      ((negativeDeviation / services.length) * 100).toFixed(1),

    meanDeviationPercent: (mean * 100).toFixed(2),
    stdDeviationPercent: (stdDeviation * 100).toFixed(2),

    status: "ok"
  };
}