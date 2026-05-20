import { calculateAverageSpeed } from "../core/trafficAnalyzer.js";
import { calculateConfidence } from "../core/confidenceEngine.js";
import { calculateCorrectionFactor } from "../core/learningEngine.js";
import { getRecentServices } from "../services/learningService.js";
import { classifyService } from "../core/serviceClassifier.js";
import { fareSchema } from "../validation/fareSchema.js";
import { getTariffProfileByCity } from "../config/tariffProfiles.js";
import logger from "../utils/logger.js";

// Ajuste temporal de calibración piloto TAXIPRO.
// Incrementa la estimación final un 8% para corregir desviación detectada a la baja.
const PILOT_PRICE_ADJUSTMENT_FACTOR = 1.08;

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

function isUrbanNight(date, profile) {
  const hour = date.getHours();
  const start = Number(profile.rules?.urbanNightStartHour || 21);
  const end = Number(profile.rules?.urbanDayStartHour || 7);

  return hour >= start || hour < end;
}

function normalizePlaceText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUrbanScopeKeywords(profile) {
  return Array.isArray(profile.urbanScopeKeywords)
    ? profile.urbanScopeKeywords.map(normalizePlaceText)
    : [];
}

function isInsideUrbanScope(placeText, profile) {
  const text = normalizePlaceText(placeText);

  if (!text) return false;

  const keywords = getUrbanScopeKeywords(profile);

  return keywords.some((keyword) => {
    return keyword && text.includes(keyword);
  });
}

function resolveRouteScope({ city, origin, destination, stops = [], profile }) {
  const normalizedCity = normalizePlaceText(city);

  if (
    normalizedCity.includes("interurb") ||
    normalizedCity.includes("t3") ||
    normalizedCity.includes("t4")
  ) {
    return {
      scope: "interurban",
      reason: "Servicio marcado como interurbano"
    };
  }

  const points = [
    origin,
    ...(Array.isArray(stops) ? stops : []),
    destination
  ].filter(Boolean);

  if (points.length < 2) {
    return {
      scope: "urban",
      reason: "Ruta incompleta; se aplica ámbito urbano por defecto"
    };
  }

  const allInsideUrbanScope = points.every((point) =>
    isInsideUrbanScope(point, profile)
  );

  if (allInsideUrbanScope) {
    return {
      scope: "urban",
      reason: "Origen y destino dentro del ámbito urbano ampliado de Palma"
    };
  }

  return {
    scope: "interurban",
    reason: "Origen o destino fuera del ámbito urbano ampliado de Palma"
  };
}

function resolveTariff({
  city,
  origin,
  destination,
  stops = [],
  profile,
  now = new Date()
}) {
  const routeScope = resolveRouteScope({
    city,
    origin,
    destination,
    stops,
    profile
  });

  const day = now.getDay(); // 0 domingo, 6 sábado
  const minutes = now.getHours() * 60 + now.getMinutes();

  const sixAM = 6 * 60;
  const twoPM = 14 * 60;
  const ninePM = 21 * 60;

  const sunday = day === 0;

  if (routeScope.scope === "interurban") {
    if (sunday) {
      return {
        ...profile.tariffs.T4,
        routeScope: routeScope.scope,
        routeScopeReason: routeScope.reason,
        reason: "Interurbana en domingo o festivo"
      };
    }

    if (day === 6) {
      const isSaturdayT3 = minutes >= sixAM && minutes < twoPM;

      return {
        ...(isSaturdayT3 ? profile.tariffs.T3 : profile.tariffs.T4),
        routeScope: routeScope.scope,
        routeScopeReason: routeScope.reason,
        reason: isSaturdayT3
          ? "Interurbana sábado entre 06:00 y 14:00"
          : "Interurbana sábado desde las 14:00"
      };
    }

    const isDay = minutes >= sixAM && minutes < ninePM;

    return {
      ...(isDay ? profile.tariffs.T3 : profile.tariffs.T4),
      routeScope: routeScope.scope,
      routeScopeReason: routeScope.reason,
      reason: isDay
        ? "Interurbana laborable entre 06:00 y 21:00"
        : "Interurbana nocturna entre 21:00 y 06:00"
    };
  }

  const urbanNight = isUrbanNight(now, profile);

  if (sunday || urbanNight) {
    return {
      ...profile.tariffs.T2,
      routeScope: routeScope.scope,
      routeScopeReason: routeScope.reason,
      reason: sunday
        ? "Urbana en domingo o festivo"
        : "Urbana nocturna entre 21:00 y 07:00"
    };
  }

  return {
    ...profile.tariffs.T1,
    routeScope: routeScope.scope,
    routeScopeReason: routeScope.reason,
    reason: "Urbana laborable entre 07:00 y 21:00"
  };
}

function resolveSupplementKey(profile, key, scope) {
  const cleanKey = String(key || "").trim();

  if (!cleanKey) return "";

  const alias = profile.supplementAliases?.[cleanKey];

  if (alias) {
    return alias?.[scope] || "";
  }

  return cleanKey;
}

function getSupplementDefinition(profile, key) {
  return profile.supplements?.[key] || null;
}

function getSupplementsApplied(profile, supplements = [], scope = "urban") {
  if (!Array.isArray(supplements)) return [];

  return supplements
    .map((originalKey) => {
      const resolvedKey = resolveSupplementKey(profile, originalKey, scope);

      if (!resolvedKey) {
        return null;
      }

      const definition = getSupplementDefinition(profile, resolvedKey);

      return {
        key: resolvedKey,
        originalKey,
        label: definition?.label || resolvedKey,
        amount: Number(definition?.amount || 0),
        scope: definition?.scope || scope
      };
    })
    .filter(Boolean);
}

function calculateSupplementsTotal(profile, supplements = [], scope = "urban") {
  return getSupplementsApplied(profile, supplements, scope).reduce((sum, item) => {
    return sum + Number(item.amount || 0);
  }, 0);
}

function calculateBaseEstimatedPrice({ distance, duration, tariff }) {
  const distancePart = distance * tariff.priceKm;
  const timePart = (duration / 60) * tariff.waitingHour;

  return {
    basePrice: tariff.flagfall + distancePart + timePart,
    distancePart,
    timePart,
    billableDistance: distance,
    appliedDistanceFactor: 1
  };
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
      supplements = [],
      origin = "",
      destination = "",
      stops = []
    } = parsed.data;

    const selectedSupplements = normalizeSelectedSupplements(supplements);
    const tariffProfile = getTariffProfileByCity(city);

    const tariff = resolveTariff({
      city,
      origin,
      destination,
      stops,
      profile: tariffProfile,
      now: new Date()
    });

    logger.info(
      {
        distance,
        duration,
        city,
        origin,
        destination,
        stops,
        tariffProfile: tariffProfile.id,
        tariffCode: tariff.code,
        tariffName: tariff.name,
        routeScope: tariff.routeScope || tariff.scope,
        routeScopeReason: tariff.routeScopeReason || null,
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

    const tariffScope = tariff.routeScope || tariff.scope || "urban";

    const supplementsApplied = getSupplementsApplied(
      tariffProfile,
      selectedSupplements,
      tariffScope
    );

    const supplementsTotal = calculateSupplementsTotal(
      tariffProfile,
      selectedSupplements,
      tariffScope
    );

    const baseCalculation = calculateBaseEstimatedPrice({
      distance,
      duration,
      tariff
    });

    let price = baseCalculation.basePrice;

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
        origin,
        destination,
        stops,
        type,
        tariffProfile: tariffProfile.id,
        tariffCode: tariff.code,
        tariffName: tariff.name,
        tariffReason: tariff.reason,
        routeScope: tariff.routeScope || tariff.scope,
        routeScopeReason: tariff.routeScopeReason || null,
        supplements: selectedSupplements,
        supplementsApplied,
        supplementsTotal,
        baseCalculation,
        correctionFactor,
        pilotAdjustmentFactor: PILOT_PRICE_ADJUSTMENT_FACTOR,
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

      tariffProfile: {
        id: tariffProfile.id,
        label: tariffProfile.label,
        jurisdiction: tariffProfile.jurisdiction,
        sourceLabel: tariffProfile.sourceLabel,
        sourceNote: tariffProfile.sourceNote
      },

      tariff: {
        code: tariff.code,
        name: tariff.name,
        reason: tariff.reason,
        scope: tariff.scope,
        routeScope: tariff.routeScope || tariff.scope,
        routeScopeReason: tariff.routeScopeReason || null,
        period: tariff.period,
        flagfall: tariff.flagfall,
        priceKm: tariff.priceKm,
        waitingHour: tariff.waitingHour,
        waitingMinute: Number((tariff.waitingHour / 60).toFixed(4))
      },

      tariffCode: tariff.code,
      tariffName: tariff.name,
      tariffReason: tariff.reason,

      routeScope: tariff.routeScope || tariff.scope,
      routeScopeReason: tariff.routeScopeReason || null,

      supplements: {
        selected: selectedSupplements,
        applied: supplementsApplied,
        total: supplementsTotal
      },

      calibration: {
        correctionFactor,
        pilotAdjustmentFactor: PILOT_PRICE_ADJUSTMENT_FACTOR,
        learningStatus
      },

      meta: {
        speed,
        city: city || null,
        origin: origin || null,
        destination: destination || null,
        stops,
        type,
        routeScope: tariff.routeScope || tariff.scope,
        routeScopeReason: tariff.routeScopeReason || null,
        baseCalculation,
        correctionFactor,
        pilotAdjustmentFactor: PILOT_PRICE_ADJUSTMENT_FACTOR,
        learningStatus,
        model: "taximeter_v9_effective_interurban_km"
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