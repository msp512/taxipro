import { calculateAverageSpeed } from "../core/trafficAnalyzer.js";
import { calculateConfidence } from "../core/confidenceEngine.js";
import { calculateCorrectionFactor } from "../core/learningEngine.js";
import { getRecentServices } from "../services/learningService.js";
import { classifyService } from "../core/serviceClassifier.js";
import { fareSchema } from "../validation/fareSchema.js";
import logger from "../utils/logger.js";

const CROSS_SPEED = 18;

// Ajuste temporal de calibración piloto TAXIPRO.
// Incrementa la estimación final un 8% para corregir desviación detectada a la baja.
const PILOT_PRICE_ADJUSTMENT_FACTOR = 1.08;

const TARIFF = {
  baseFare: 2.5,
  priceKm: 1.2,
  priceMinute: 19.4 / 60
};

const SUPPLEMENT_VALUES = {
  // Compatibilidad antigua
  airport: 4.65,
  radio: 1.15,
  christmas: 4.75,
  mountain1: 4.26,
  mountain2: 4.26,

  // Palma / Tarifa 1-2
  airport_t12: 4.65,
  port_t12: 4.65,
  radio_t12: 1.15,
  mountain1_t12: 4.26,
  mountain2_t12: 4.26,

  // Interurbana / Tarifa 3-4
  airport_t34: 3.08,
  port_t34: 3.08,
  radio_t34: 1.11,
  mountain1_t34: 4.26,
  mountain2_t34: 4.26,

  // Especiales
  holiday_special: 4.75
};

function isValidServiceData({ deviation, distance, duration, speed }) {
  if (typeof deviation !== "number") return false;
  if (typeof distance !== "number") return false;
  if (typeof duration !== "number") return false;
  if (typeof speed !== "number") return false;

  if (Math.abs(deviation) > 0.35) return false;
  if (distance < 0.5 || duration < 3) return false;
  if (speed < 5 || speed > 120) return false;

  return true;
}

function normalizeSupplementKey(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item.trim();
  }

  if (typeof item === "object" && item.key) {
    return String(item.key).trim();
  }

  return "";
}

function normalizeSelectedSupplements(supplements = []) {
  if (!Array.isArray(supplements)) return [];

  return supplements
    .map(normalizeSupplementKey)
    .filter(Boolean);
}

function calculateSupplementsTotal(supplements = []) {
  if (!Array.isArray(supplements)) return 0;

  return supplements.reduce((sum, item) => {
    const key = normalizeSupplementKey(item);
    return sum + (SUPPLEMENT_VALUES[key] || 0);
  }, 0);
}

function calculateBaseEstimatedPrice({ distance, duration, speed }) {
  const distancePart = distance * TARIFF.priceKm;

  let timePart = 0;

  if (speed < CROSS_SPEED) {
    const timeWeight = Math.min(1, (CROSS_SPEED - speed) / CROSS_SPEED);
    const effectiveTime = duration * timeWeight;
    timePart = effectiveTime * TARIFF.priceMinute;
  }

  return TARIFF.baseFare + distancePart + timePart;
}

function calculateMarginBySpeed(speed) {
  if (speed < 15) return 0.1;
  if (speed < 25) return 0.07;
  if (speed > 40) return 0.03;
  return 0.05;
}

function normalizeZodError(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
}

export async function estimateFare(req, res) {
  const start = Date.now();

  try {
    const parsed = fareSchema.safeParse(req.body);

    if (!parsed.success) {
      const durationMs = Date.now() - start;

      logger.warn(
        {
          body: req.body,
          validationErrors: normalizeZodError(parsed.error),
          durationMs
        },
        "Fare validation failed"
      );

      return res.status(400).json({
        error: "invalid fare request",
        details: normalizeZodError(parsed.error)
      });
    }

    const {
      distance,
      duration,
      city,
      supplements = []
    } = parsed.data;

    const selectedSupplements = normalizeSelectedSupplements(supplements);

    logger.info(
      {
        distance,
        duration,
        city,
        supplements: selectedSupplements
      },
      "Fare request received"
    );

    const type = classifyService({
      distance,
      duration,
      supplements: selectedSupplements
    });

    const speed = calculateAverageSpeed(distance * 1000, duration * 60);

    if (typeof speed !== "number" || Number.isNaN(speed) || speed <= 0) {
      logger.warn(
        {
          distance,
          duration,
          speed
        },
        "Invalid speed calculation"
      );

      return res.status(400).json({
        error: "invalid speed calculation"
      });
    }

    const supplementsTotal = calculateSupplementsTotal(selectedSupplements);

    let price = calculateBaseEstimatedPrice({
      distance,
      duration,
      speed
    });

    let correctionFactor = 1;
    let learningStatus = "not_used";

    try {
      const services = await getRecentServices(req.app.locals.db, type);
      const safeServices = Array.isArray(services) ? services : [];

      const validServices = safeServices.filter((service) =>
        isValidServiceData({
          deviation: service.deviation,
          distance: service.distance_km,
          duration: service.duration_min,
          speed: service.speed
        })
      );

      const calculatedFactor = calculateCorrectionFactor(validServices);

      if (typeof calculatedFactor === "number" && Number.isFinite(calculatedFactor)) {
        correctionFactor = calculatedFactor;
        learningStatus = "applied";
      } else {
        correctionFactor = 1;
        learningStatus = "fallback";
      }
    } catch (learningError) {
      learningStatus = "fallback";

      logger.warn(
        {
          error: learningError.message,
          type
        },
        "Learning system not available"
      );
    }

    price *= correctionFactor;
    price += supplementsTotal;

    // Ajuste temporal de piloto: corrige estimaciones detectadas ligeramente bajas.
    price *= PILOT_PRICE_ADJUSTMENT_FACTOR;

    price = Number(price.toFixed(2));

    const confidence = calculateConfidence(distance, duration, speed);
    const margin = calculateMarginBySpeed(speed);

    const minPrice = Number((price * (1 - margin)).toFixed(2));
    const maxPrice = Number((price * (1 + margin)).toFixed(2));

    const durationMs = Date.now() - start;

    logger.info(
      {
        durationMs,
        distance,
        duration,
        speed,
        city,
        type,
        supplements: selectedSupplements,
        supplementsTotal,
        correctionFactor,
        confidence,
        price,
        minPrice,
        maxPrice,
        learningStatus
      },
      "Fare calculation completed"
    );

    return res.json({
      price,
      interval: {
        min: minPrice,
        max: maxPrice
      },
      confidence,
      supplements: {
        selected: selectedSupplements,
        total: supplementsTotal
      },
      meta: {
        speed,
        city: city || null,
        type,
        correctionFactor,
        learningStatus,
        model: "taximeter_v3_intelligent"
      }
    });
  } catch (error) {
    const durationMs = Date.now() - start;

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        body: req.body,
        durationMs
      },
      "Fare calculation error"
    );

    return res.status(500).json({
      error: "fare calculation failed",
      detail: error.message
    });
  }
}