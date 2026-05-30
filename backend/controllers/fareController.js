import { calculateAverageSpeed } from "../core/trafficAnalyzer.js";
import { calculateConfidence } from "../core/confidenceEngine.js";
import { classifyService } from "../core/serviceClassifier.js";
import { calculateTaximeterFare } from "../core/taximeterEngine.js";
import { fareSchema } from "../validation/fareSchema.js";
import { getTariffProfileByCity } from "../config/tariffProfiles.js";
import logger from "../utils/logger.js";

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function normalizePlaceText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ");
}

function parseCoordinatePair(value = "") {
  const text = String(value || "").trim();

  const match = text.match(
    /^\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*$/
  );

  if (!match) return null;

  const lat = Number(match[1].replace(",", "."));
  const lng = Number(match[2].replace(",", "."));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function isCoordinateInsidePalmaUrbanScope(value = "") {
  const point = parseCoordinatePair(value);

  if (!point) return false;

  const { lat, lng } = point;

  /*
    Ámbito urbano operativo TAXIPRO Palma:
    Incluye Palma, Playa de Palma, Can Pastilla, aeropuerto,
    Coll d'en Rabassa, Port/Dique Oeste y zona urbana ampliada.
    No pretende definir toda Mallorca: solo evitar que coordenadas
    urbanas de Palma se clasifiquen como interurbanas.
  */
  return (
    lat >= 39.49 &&
    lat <= 39.62 &&
    lng >= 2.58 &&
    lng <= 2.80
  );
}

function isKnownPalmaUrbanCoordinate(value = "") {
  const point = parseCoordinatePair(value);

  if (!point) return false;

  const { lat, lng } = point;

  const knownPoints = [
    // Paradas oficiales Playa de Palma
    { lat: 39.536306, lng: 2.717361 },   // Ca'n Pastilla
    { lat: 39.5263030, lng: 2.7352832 }, // Pil·larí
    { lat: 39.5220475, lng: 2.7402520 }, // Sometimes / Marina Plaza
    { lat: 39.5178809, lng: 2.7446482 }, // RIU
    { lat: 39.513167, lng: 2.752253 },   // América
    { lat: 39.505614, lng: 2.751726 },   // Arenal

    // Waypoints profesionales urbanos
    { lat: 39.5407056, lng: 2.7118119 }, // Ca'n Pastilla aeropuerto
    { lat: 39.533147, lng: 2.734151 },   // Sometimes acceso autopista

    // Dique Oeste
    { lat: 39.5519885, lng: 2.6392256 }
  ];

  const tolerance = 0.003;

  return knownPoints.some((p) => {
    return (
      Math.abs(lat - p.lat) <= tolerance &&
      Math.abs(lng - p.lng) <= tolerance
    );
  });
}

function getMallorcaNow(date = new Date()) {
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: "Europe/Madrid"
    })
  );
}

function getUrbanScopeKeywords(profile) {
  return Array.isArray(profile.urbanScopeKeywords)
    ? profile.urbanScopeKeywords.map(normalizePlaceText)
    : [];
}

function isInsideUrbanScope(placeText, profile) {
  const text = normalizePlaceText(placeText);

  if (!text) return false;

  if (isKnownPalmaUrbanCoordinate(placeText)) {
    return true;
  }

  if (isCoordinateInsidePalmaUrbanScope(placeText)) {
    return true;
  }

  const keywords = getUrbanScopeKeywords(profile);

  return keywords.some((keyword) => {
    return keyword && text.includes(keyword);
  });
}

function isAirportPlace(value = "") {
  const text = normalizePlaceText(value);

  return (
    text.includes("aeropuerto") ||
    text.includes("aeroport") ||
    text.includes("airport") ||
    text.includes("pmi")
  );
}

function isPalmaUrbanCoordinate(value = "") {
  const point = parseCoordinatePair(value);

  if (!point) return false;

  const { lat, lng } = point;

  /*
    Ámbito urbano operativo Palma / TAXIPRO.

    Incluye:
    - Palma ciudad
    - Playa de Palma
    - Can Pastilla
    - Arenal zona Palma
    - Aeropuerto PMI
    - Dique Oeste / Puerto
    - Coll d'en Rabassa
    - Son Espases

    Objetivo:
    Evitar que coordenadas puras de paradas urbanas se clasifiquen como interurbanas.
  */
  return (
    lat >= 39.49 &&
    lat <= 39.62 &&
    lng >= 2.58 &&
    lng <= 2.80
  );
}

function isMallorcaFashionOutletPlace(value = "") {
  const text = normalizePlaceText(value);
  const point = parseCoordinatePair(value);

  const matchesText =
    text.includes("mallorca fashion outlet") ||
    text.includes("fashion outlet") ||
    text.includes("festival park") ||
    text.includes("marratxi") ||
    text.includes("marratxi outlet") ||
    text.includes("marratxí");

  if (matchesText) {
    return true;
  }

  if (!point) {
    return false;
  }

  const { lat, lng } = point;

  /*
    Mallorca Fashion Outlet / Marratxi.
    Regla específica TAXIPRO/APC 2026:
    Marratxi queda equiparado a Palma y el Outlet debe tratarse como
    ámbito urbano ampliado para aplicar Tarifa 1 / Tarifa 2.
  */
  return (
    lat >= 39.625 &&
    lat <= 39.645 &&
    lng >= 2.705 &&
    lng <= 2.735
  );
}

function isPalmaUrbanText(value = "") {
  const text = normalizePlaceText(value);

  if (!text) return false;

  return (
    text.includes("palma") ||
    text.includes("platja de palma") ||
    text.includes("playa de palma") ||
    text.includes("can pastilla") ||
    text.includes("arenal") ||
    text.includes("s arenal") ||
    text.includes("les meravelles") ||
    text.includes("maravelles") ||
    text.includes("sometimes") ||
    text.includes("riu") ||
    text.includes("pillari") ||
    text.includes("pil lari") ||
    text.includes("aeropuerto") ||
    text.includes("aeroport") ||
    text.includes("airport") ||
    text.includes("pmi") ||
    text.includes("son sant joan") ||
    text.includes("dique del oeste") ||
    text.includes("dic de l oest") ||
    text.includes("puerto de palma") ||
    text.includes("port de palma") ||
    text.includes("coll den rabassa") ||
    text.includes("coll d en rabassa") ||
    text.includes("son espases") ||
    isMallorcaFashionOutletPlace(value)
  );
}

function isInsidePalmaUrbanOperationalScope(value = "") {
  return (
    isPalmaUrbanCoordinate(value) ||
    isPalmaUrbanText(value) ||
    isMallorcaFashionOutletPlace(value)
  );
}

function resolveRouteScope({
  city,
  origin,
  destination,
  stops = [],
  profile
}) {
  const routePoints = [
    origin,
    ...(Array.isArray(stops) ? stops : []),
    destination
  ].filter(Boolean);

  const cityText = normalizePlaceText(city);

  const isPalmaCity =
    cityText.includes("palma") ||
    profile?.id === "PALMA_MALLORCA_2026";

  /*
    Regla prioritaria TAXIPRO Palma:
    Si todos los puntos de la ruta están dentro del ámbito urbano operativo
    de Palma, la ruta es urbana aunque origen/destino sean coordenadas puras.
  */
  if (isPalmaCity && routePoints.length >= 2) {
    const allInsidePalmaUrbanScope = routePoints.every((point) =>
      isInsidePalmaUrbanOperationalScope(point)
    );

    if (allInsidePalmaUrbanScope) {
      return {
        scope: "urban",
        reason: "Origen, destino y paradas dentro del ámbito urbano operativo de Palma"
      };
    }
  }

  /*
    Fallback anterior basado en keywords del perfil.
    Se mantiene para no romper otros municipios/perfiles.
  */
  const allInsideProfileUrbanScope = routePoints.every((point) =>
    isInsideUrbanScope(point, profile)
  );

  if (allInsideProfileUrbanScope) {
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
  const localNow = getMallorcaNow(now);

  const routeScope = resolveRouteScope({
    city,
    origin,
    destination,
    stops,
    profile
  });

  const day = localNow.getDay(); // 0 domingo, 6 sábado
  const minutes = localNow.getHours() * 60 + localNow.getMinutes();

  const sixAM = 6 * 60;
  const sevenAM = 7 * 60;
  const twoPM = 14 * 60;
  const ninePM = 21 * 60;

  const isSunday = day === 0;
  const isSaturday = day === 6;

  if (routeScope.scope === "interurban") {
    if (isSunday) {
      return {
        ...profile.tariffs.T4,
        routeScope: routeScope.scope,
        routeScopeReason: routeScope.reason,
        reason: "Interurbana en domingo o festivo"
      };
    }

    if (isSaturday) {
      const saturdayT3 = minutes >= sixAM && minutes < twoPM;

      return {
        ...(saturdayT3 ? profile.tariffs.T3 : profile.tariffs.T4),
        routeScope: routeScope.scope,
        routeScopeReason: routeScope.reason,
        reason: saturdayT3
          ? "Interurbana sábado entre 06:00 y 14:00"
          : "Interurbana sábado desde las 14:00"
      };
    }

    const interurbanDay = minutes >= sixAM && minutes < ninePM;

    return {
      ...(interurbanDay ? profile.tariffs.T3 : profile.tariffs.T4),
      routeScope: routeScope.scope,
      routeScopeReason: routeScope.reason,
      reason: interurbanDay
        ? "Interurbana laborable entre 06:00 y 21:00"
        : "Interurbana nocturna entre 21:00 y 06:00"
    };
  }

  // Tarifa de referencia Mallorca 2025:
  // sábado, domingo y festivo son festivos; laborable solo lunes-viernes 07:00-21:00.
  if (isSaturday || isSunday) {
    return {
      ...profile.tariffs.T2,
      routeScope: routeScope.scope,
      routeScopeReason: routeScope.reason,
      reason: isSaturday
        ? "Urbana en sábado/festivo"
        : "Urbana en domingo o festivo"
    };
  }

  const urbanDay = minutes >= sevenAM && minutes < ninePM;

  return {
    ...(urbanDay ? profile.tariffs.T1 : profile.tariffs.T2),
    routeScope: routeScope.scope,
    routeScopeReason: routeScope.reason,
    reason: urbanDay
      ? "Urbana laborable entre 07:00 y 21:00"
      : "Urbana nocturna entre 21:00 y 07:00"
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

      if (!resolvedKey) return null;

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
  return getSupplementsApplied(profile, supplements, scope).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
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

function applyAirportMinimumFare({
  price,
  origin,
  profile,
  tariffScope
}) {
  const minimumFare = profile.rules?.airportMinimumFare;

  if (
    tariffScope !== "urban" ||
    !minimumFare?.enabled ||
    !minimumFare?.appliesWhenOriginIsAirport ||
    !isAirportPlace(origin)
  ) {
    return {
      price,
      airportMinimumApplied: false
    };
  }

  const minimumAmount = toNumber(minimumFare.amount);

  if (minimumAmount > 0 && price < minimumAmount) {
    return {
      price: minimumAmount,
      airportMinimumApplied: true
    };
  }

  return {
    price,
    airportMinimumApplied: false
  };
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

    const type = classifyService({
      distance,
      duration,
      supplements: selectedSupplements
    });

    const taximeterCalculation = calculateTaximeterFare({
      distanceKm: distance,
      durationMinutes: duration,
      tariff,
      supplementsTotal
    });

    const minimumResult = applyAirportMinimumFare({
      price: taximeterCalculation.price,
      origin,
      profile: tariffProfile,
      tariffScope
    });

    const price = Number(minimumResult.price.toFixed(2));
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
        routeScope: tariffScope,
        routeScopeReason: tariff.routeScopeReason || null,
        supplements: selectedSupplements,
        supplementsApplied,
        supplementsTotal,
        taximeterCalculation,
        airportMinimumApplied: minimumResult.airportMinimumApplied,
        confidence,
        price,
        minPrice,
        maxPrice
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
        routeScope: tariffScope,
        routeScopeReason: tariff.routeScopeReason || null,
        period: tariff.period,
        flagfall: tariff.flagfall,
        priceKm: tariff.priceKm,
        waitingHour: tariff.waitingHour,
        jumpValue: tariff.jumpValue,
        metersPerJump: tariff.metersPerJump,
        secondsPerJump: tariff.secondsPerJump,
        speedLimitKmh: tariff.speedLimitKmh,
        includedKm: tariff.includedKm
      },

      tariffCode: tariff.code,
      tariffName: tariff.name,
      tariffReason: tariff.reason,

      routeScope: tariffScope,
      routeScopeReason: tariff.routeScopeReason || null,

      supplements: {
        selected: selectedSupplements,
        applied: supplementsApplied,
        total: supplementsTotal
      },

      calibration: {
        correctionFactor: 1,
        pilotAdjustmentFactor: 1,
        learningStatus: "disabled_taximeter_jumps"
      },

      meta: {
        speed,
        city: city || null,
        origin: origin || null,
        destination: destination || null,
        stops,
        type,
        routeScope: tariffScope,
        routeScopeReason: tariff.routeScopeReason || null,
        baseCalculation: taximeterCalculation,
        airportMinimumApplied: minimumResult.airportMinimumApplied,
        correctionFactor: 1,
        pilotAdjustmentFactor: 1,
        learningStatus: "disabled_taximeter_jumps",
        model: "taximeter_jumps_controller_v1"
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