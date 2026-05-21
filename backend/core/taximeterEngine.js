function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value) {
  return Number(toNumber(value).toFixed(2));
}

function roundMetric(value, decimals = 3) {
  return Number(toNumber(value).toFixed(decimals));
}

function calculateAverageSpeedKmh(distanceKm, durationMinutes) {
  const distance = toNumber(distanceKm);
  const duration = toNumber(durationMinutes);

  if (distance <= 0 || duration <= 0) return 0;

  return distance / (duration / 60);
}

function deriveMetersPerJump(tariff) {
  const jumpValue = toNumber(tariff.jumpValue);
  const priceKm = toNumber(tariff.priceKm);

  if (jumpValue <= 0 || priceKm <= 0) return null;

  return (jumpValue / priceKm) * 1000;
}

function deriveSecondsPerJump(tariff) {
  const jumpValue = toNumber(tariff.jumpValue);
  const waitingHour = toNumber(tariff.waitingHour);

  if (jumpValue <= 0 || waitingHour <= 0) return null;

  return jumpValue / (waitingHour / 3600);
}

function deriveSpeedLimitKmh(tariff) {
  const priceKm = toNumber(tariff.priceKm);
  const waitingHour = toNumber(tariff.waitingHour);

  if (priceKm <= 0 || waitingHour <= 0) return null;

  return waitingHour / priceKm;
}

function resolveTaximeterParams(tariff) {
  const metersPerJump =
    toNumber(tariff.metersPerJump) > 0
      ? toNumber(tariff.metersPerJump)
      : deriveMetersPerJump(tariff);

  const secondsPerJump =
    toNumber(tariff.secondsPerJump) > 0
      ? toNumber(tariff.secondsPerJump)
      : deriveSecondsPerJump(tariff);

  const speedLimitKmh =
    toNumber(tariff.speedLimitKmh) > 0
      ? toNumber(tariff.speedLimitKmh)
      : deriveSpeedLimitKmh(tariff);

  return {
    jumpValue: toNumber(tariff.jumpValue),
    metersPerJump,
    secondsPerJump,
    speedLimitKmh
  };
}

export function calculateTaximeterFare({
  distanceKm,
  durationMinutes,
  tariff,
  supplementsTotal = 0
}) {
  const distance = toNumber(distanceKm);
  const duration = toNumber(durationMinutes);
  const supplements = toNumber(supplementsTotal);

  const flagfall = toNumber(tariff.flagfall);
  const includedKm = toNumber(tariff.includedKm, 0);

  const {
    jumpValue,
    metersPerJump,
    secondsPerJump,
    speedLimitKmh
  } = resolveTaximeterParams(tariff);

  if (
    distance <= 0 ||
    duration <= 0 ||
    flagfall <= 0 ||
    jumpValue <= 0 ||
    !metersPerJump ||
    !secondsPerJump ||
    !speedLimitKmh
  ) {
    throw new Error("Invalid taximeter tariff parameters");
  }

  const speedKmh = calculateAverageSpeedKmh(distance, duration);

  const billableKm = Math.max(distance - includedKm, 0);
  const billableMeters = billableKm * 1000;

  const distanceJumps = Math.ceil(billableMeters / metersPerJump);
  const distancePart = distanceJumps * jumpValue;

  let timeWeight = 0;
  let effectiveSlowSeconds = 0;
  let timeJumps = 0;
  let timePart = 0;

  if (speedKmh > 0 && speedKmh < speedLimitKmh) {
    timeWeight = Math.min(1, (speedLimitKmh - speedKmh) / speedLimitKmh);
    effectiveSlowSeconds = duration * 60 * timeWeight;
    timeJumps = Math.ceil(effectiveSlowSeconds / secondsPerJump);
    timePart = timeJumps * jumpValue;
  }

  const basePrice = flagfall + distancePart + timePart;
  const price = basePrice + supplements;

  return {
    price: roundMoney(price),
    basePrice: roundMoney(basePrice),

    flagfall: roundMoney(flagfall),
    distancePart: roundMoney(distancePart),
    timePart: roundMoney(timePart),
    supplementsTotal: roundMoney(supplements),

    distanceKm: roundMetric(distance),
    durationMinutes: roundMetric(duration),
    billableKm: roundMetric(billableKm),
    includedKm: roundMetric(includedKm),

    distanceJumps,
    timeJumps,

    jumpValue: roundMoney(jumpValue),
    metersPerJump: roundMetric(metersPerJump, 2),
    secondsPerJump: roundMetric(secondsPerJump, 2),

    speedKmh: roundMetric(speedKmh, 2),
    speedLimitKmh: roundMetric(speedLimitKmh, 2),
    effectiveSlowSeconds: roundMetric(effectiveSlowSeconds, 0),
    timeWeight: roundMetric(timeWeight, 4),

    model: "taximeter_jumps_v1"
  };
}