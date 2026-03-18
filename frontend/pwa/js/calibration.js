/* ===============================
   TAXIPRO CALIBRATION v1.0
   =============================== */

const MIN_SERVICES_REQUIRED = 100;
const MIN_DAYS_BETWEEN_REVIEWS = 30;
const MIN_DEVIATION_THRESHOLD = 0.0075; // 0,75%
const OUTLIER_LIMIT = 0.15; // ±15%
const MIN_FAC = 0.005; // 0,5%
const MAX_FAC = 0.04;  // 4%

/* ===============================
   GET LAST REVIEW DATE
   =============================== */

function getLastCalibrationDate() {
  return localStorage.getItem("taxipro_last_calibration");
}

function setLastCalibrationDate() {
  localStorage.setItem("taxipro_last_calibration", Date.now());
}

/* ===============================
   MAIN CALIBRATION FUNCTION
   =============================== */

export function computeDynamicFAC(currentFAC) {

  const services = getValidServicesLast90Days();

  if (services.length < MIN_SERVICES_REQUIRED) {
    return {
      status: "insufficient_data",
      validServices: services.length
    };
  }

  const lastReview = getLastCalibrationDate();
  const now = Date.now();

  if (lastReview && (now - lastReview) < (MIN_DAYS_BETWEEN_REVIEWS * 24 * 60 * 60 * 1000)) {
    return {
      status: "too_early",
      nextReviewInDays: Math.ceil(
        (MIN_DAYS_BETWEEN_REVIEWS * 24 * 60 * 60 * 1000 - (now - lastReview)) / (24 * 60 * 60 * 1000)
      )
    };
  }

  /* ===== Remove Outliers ===== */

  const filtered = services.filter(service => {
    if (!service.real_total) return false;

    const deviation =
      (service.real_total - service.estimated_total) /
      service.estimated_total;

    return Math.abs(deviation) <= OUTLIER_LIMIT;
  });

  if (filtered.length < MIN_SERVICES_REQUIRED) {
    return {
      status: "insufficient_after_outlier_filter",
      validServices: filtered.length
    };
  }

  /* ===== Mean Absolute Deviation ===== */

  let totalDeviation = 0;

  filtered.forEach(service => {
    const deviation =
      (service.real_total - service.estimated_total) /
      service.estimated_total;

    totalDeviation += deviation;
  });

  const meanDeviation = totalDeviation / filtered.length;
  const absMeanDeviation = Math.abs(meanDeviation);

  if (absMeanDeviation < MIN_DEVIATION_THRESHOLD) {
    return {
      status: "within_tolerance",
      meanDeviation
    };
  }

  /* ===== Proposed Adjustment ===== */

  let proposedFAC = currentFAC + meanDeviation;

  if (proposedFAC < MIN_FAC) proposedFAC = MIN_FAC;
  if (proposedFAC > MAX_FAC) proposedFAC = MAX_FAC;

  return {
    status: "adjustment_proposed",
    currentFAC,
    meanDeviation,
    proposedFAC,
    validServices: filtered.length
  };
}