import db from "../db.js";

function normalizeTaxiCode(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function normalizeText(value, fallback = "") {
  return value ? String(value).trim() : fallback;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return false;
}

function normalizeTimestamp(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

async function getAuthorizedTaxi(cleanTaxiCode) {
  const authQuery = `
    SELECT taxi_code, status
    FROM authorized_taxis
    WHERE taxi_code = $1
    LIMIT 1
  `;

  const authResult = await db.query(authQuery, [cleanTaxiCode]);
  return authResult.rows[0] || null;
}

function isActiveTaxiStatus(status) {
  return String(status || "").trim().toLowerCase() === "active";
}

export async function registerService(req, res) {
  try {
    const {
      taxi_id,
      taxi_code,
      origin,
      destination,
      destination_initial,
      destination_final,
      distance_km,
      duration_min,
      estimated_price,
      estimated_price_initial,
      estimated_price_final,
      meter_price,
      city,
      route_mode,
      destination_changed,
      destination_changed_at,
      stops_json
    } = req.body;

    const cleanTaxiCode = normalizeTaxiCode(taxi_code || taxi_id);
    const cleanOrigin = normalizeText(origin);
    const cleanDestination = normalizeText(destination);
    const cleanDestinationInitial = normalizeText(
      destination_initial || destination || cleanDestination
    );
    const cleanDestinationFinal = normalizeText(
      destination_final || destination || cleanDestination
    );
    const cleanCity = normalizeText(city, "Palma");
    const cleanRouteMode = normalizeText(route_mode, "taxipro");

    const numericDistanceKm = Number(distance_km);
    const numericDurationMin = Number(duration_min);
    const numericEstimatedPrice = Number(estimated_price);
    const numericEstimatedPriceInitial = Number(
      estimated_price_initial ?? estimated_price
    );
    const numericEstimatedPriceFinal = Number(
      estimated_price_final ?? estimated_price
    );
    const numericMeterPrice = Number(meter_price);

    const cleanDestinationChanged = normalizeBoolean(destination_changed);
    const cleanDestinationChangedAt =
      normalizeTimestamp(destination_changed_at) ||
      (cleanDestinationChanged ? new Date().toISOString() : null);

    if (!cleanTaxiCode) {
      return res.status(400).json({ error: "taxi_code or taxi_id required" });
    }

    if (!cleanOrigin) {
      return res.status(400).json({ error: "origin required" });
    }

    if (!cleanDestinationFinal) {
      return res.status(400).json({ error: "destination required" });
    }

    if (!Number.isFinite(numericDistanceKm) || numericDistanceKm < 0) {
      return res.status(400).json({ error: "distance_km invalid" });
    }

    if (!Number.isFinite(numericDurationMin) || numericDurationMin < 0) {
      return res.status(400).json({ error: "duration_min invalid" });
    }

    if (!Number.isFinite(numericEstimatedPrice) || numericEstimatedPrice <= 0) {
      return res.status(400).json({ error: "estimated_price invalid" });
    }

    if (
      !Number.isFinite(numericEstimatedPriceInitial) ||
      numericEstimatedPriceInitial <= 0
    ) {
      return res.status(400).json({ error: "estimated_price_initial invalid" });
    }

    if (
      !Number.isFinite(numericEstimatedPriceFinal) ||
      numericEstimatedPriceFinal <= 0
    ) {
      return res.status(400).json({ error: "estimated_price_final invalid" });
    }

    if (!Number.isFinite(numericMeterPrice) || numericMeterPrice <= 0) {
      return res.status(400).json({ error: "meter_price invalid" });
    }

    const authorizedTaxi = await getAuthorizedTaxi(cleanTaxiCode);

    if (!authorizedTaxi) {
      return res.status(403).json({
        error: "taxi not authorized for pilot"
      });
    }

    if (!isActiveTaxiStatus(authorizedTaxi.status)) {
      return res.status(403).json({
        error: "taxi not active"
      });
    }

    const deviation = Number(
      (
        (numericMeterPrice - numericEstimatedPriceFinal) /
        numericEstimatedPriceFinal
      ).toFixed(4)
    );

    const cleanStopsJson = Array.isArray(stops_json) ? stops_json : [];

    const insertQuery = `
      INSERT INTO services
      (
        taxi_id,
        taxi_code,
        origin,
        destination,
        destination_initial,
        destination_final,
        distance_km,
        duration_min,
        estimated_price,
        estimated_price_initial,
        estimated_price_final,
        meter_price,
        deviation,
        city,
        route_mode,
        destination_changed,
        destination_changed_at,
        stops_json
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *
    `;

    const insertValues = [
      cleanTaxiCode,
      cleanTaxiCode,
      cleanOrigin,
      cleanDestinationFinal,
      cleanDestinationInitial,
      cleanDestinationFinal,
      numericDistanceKm,
      numericDurationMin,
      numericEstimatedPriceFinal,
      numericEstimatedPriceInitial,
      numericEstimatedPriceFinal,
      numericMeterPrice,
      deviation,
      cleanCity,
      cleanRouteMode,
      cleanDestinationChanged,
      cleanDestinationChangedAt,
      cleanStopsJson
    ];

    const result = await db.query(insertQuery, insertValues);
    const savedService = result.rows[0];

    return res.json({
      status: "ok",
      service: savedService
    });
  } catch (error) {
    console.error("Service register error:", error);
    return res.status(500).json({
      error: "service registration failed"
    });
  }
}

export async function getServicesByTaxi(req, res) {
  try {
    const taxiIdRaw = req.query.taxi_id || req.query.taxi_code;
    const limitRaw = req.query.limit;

    const cleanTaxiCode = normalizeTaxiCode(taxiIdRaw);

    const numericLimit = Number(limitRaw);
    const limit = Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(Math.trunc(numericLimit), 100)
      : 20;

    if (!cleanTaxiCode) {
      return res.status(400).json({ error: "taxi_id or taxi_code required" });
    }

    const authorizedTaxi = await getAuthorizedTaxi(cleanTaxiCode);

    if (!authorizedTaxi) {
      return res.status(403).json({
        error: "taxi not authorized for pilot"
      });
    }

    if (!isActiveTaxiStatus(authorizedTaxi.status)) {
      return res.status(403).json({
        error: "taxi not active"
      });
    }

    const query = `
      SELECT
        id,
        taxi_id,
        taxi_code,
        origin,
        destination,
        destination_initial,
        destination_final,
        distance_km,
        duration_min,
        estimated_price,
        estimated_price_initial,
        estimated_price_final,
        meter_price,
        deviation,
        city,
        route_mode,
        destination_changed,
        destination_changed_at,
        stops_json, 
        created_at
      FROM services
      WHERE taxi_code = $1 OR taxi_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `;

    const result = await db.query(query, [cleanTaxiCode, limit]);

    return res.json({
      status: "ok",
      taxi_code: cleanTaxiCode,
      count: result.rows.length,
      services: result.rows
    });
  } catch (error) {
    console.error("Get services error:", error);
    return res.status(500).json({
      error: "services fetch failed"
    });
  }
}