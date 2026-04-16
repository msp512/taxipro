import { calculateAverageSpeed } from "../core/trafficAnalyzer.js";
import { calculateConfidence } from "../core/confidenceEngine.js";
import { calculateCorrectionFactor } from "../core/learningEngine.js";
import { getRecentServices } from "../services/learningService.js";
import { classifyService } from "../core/serviceClassifier.js";
import { fareSchema } from "../validation/fareSchema.js";
import logger from "../utils/logger.js";

const CROSS_SPEED = 18;

const TARIFF = {
  baseFare: 2.5,
  priceKm: 1.2,
  priceMinute: 19.4 / 60
};

const SUPPLEMENT_VALUES = {
  airport: 4.65,
  radio: 1.15,
  christmas: 4.75,
  pax56: 3.0,
  pax78: 6.0,
  mountain1: 8.52,
  mountain2: 4.26
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

function calculateSupplementsTotal(supplements = []) {
  return supplements.reduce((sum, key) => {
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

    logger.info(
      {
        distance,
        duration,
        city,
        supplements
      },
      "Fare request received"
    );

    const type = classifyService({
      distance,
      duration,
      supplements
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

    const supplementsTotal = calculateSupplementsTotal(supplements);

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
        supplements,
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
        selected: supplements,
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
  error: "service registration failed",
  detail: error.message
});
  }
}