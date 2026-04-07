import db from "../db.js";
import supabase from "../supabaseClient.js";

export async function registerService(req, res) {
  try {
    const {
      taxi_id,
      origin,
      destination,
      distance_km,
      duration_min,
      estimated_price,
      meter_price,
      city
    } = req.body;

    const cleanTaxiId = taxi_id ? String(taxi_id).trim().toUpperCase() : "";
    const cleanOrigin = origin ? String(origin).trim() : "";
    const cleanDestination = destination ? String(destination).trim() : "";
    const cleanCity = city ? String(city).trim() : "Palma";

    const numericDistanceKm = Number(distance_km);
    const numericDurationMin = Number(duration_min);
    const numericEstimatedPrice = Number(estimated_price);
    const numericMeterPrice = Number(meter_price);

    if (!cleanTaxiId) {
      return res.status(400).json({ error: "taxi_id required" });
    }

    if (!cleanOrigin) {
      return res.status(400).json({ error: "origin required" });
    }

    if (!cleanDestination) {
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

    if (!Number.isFinite(numericMeterPrice) || numericMeterPrice <= 0) {
      return res.status(400).json({ error: "meter_price invalid" });
    }

    const deviation = Number(
      (
        (numericMeterPrice - numericEstimatedPrice) /
        numericEstimatedPrice
      ).toFixed(4)
    );

    const insertQuery = `
      INSERT INTO services
      (
        taxi_id,
        origin,
        destination,
        distance_km,
        duration_min,
        estimated_price,
        meter_price,
        deviation,
        city
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;

    const insertValues = [
      cleanTaxiId,
      cleanOrigin,
      cleanDestination,
      numericDistanceKm,
      numericDurationMin,
      numericEstimatedPrice,
      numericMeterPrice,
      deviation,
      cleanCity
    ];

    // 1) Guardado principal en PostgreSQL local
    const result = await db.query(insertQuery, insertValues);
    const savedService = result.rows[0];

    // 2) Sincronización secundaria en Supabase Cloud (no bloqueante)
    supabase
      .from("services")
      .insert([
        {
          taxi_id: cleanTaxiId,
          origin: cleanOrigin,
          destination: cleanDestination,
          distance_km: numericDistanceKm,
          duration_min: numericDurationMin,
          estimated_price: numericEstimatedPrice,
          meter_price: numericMeterPrice,
          deviation,
          city: cleanCity
        }
      ])
      .then(({ error }) => {
        if (error) {
          console.error("Supabase sync error:", error.message || error);
        } else {
          console.log("Supabase sync OK");
        }
      })
      .catch((syncError) => {
        console.error("Supabase sync exception:", syncError.message || syncError);
      });

    return res.json({
      status: "ok",
      service: savedService,
      cloud_sync: "queued"
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
    const taxiIdRaw = req.query.taxi_id;
    const limitRaw = req.query.limit;

    const cleanTaxiId = taxiIdRaw
      ? String(taxiIdRaw).trim().toUpperCase()
      : "";

    const numericLimit = Number(limitRaw);
    const limit = Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(Math.trunc(numericLimit), 100)
      : 20;

    if (!cleanTaxiId) {
      return res.status(400).json({ error: "taxi_id required" });
    }

    const query = `
      SELECT
        id,
        taxi_id,
        origin,
        destination,
        distance_km,
        duration_min,
        estimated_price,
        meter_price,
        deviation,
        city,
        created_at
      FROM services
      WHERE taxi_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `;

    const result = await db.query(query, [cleanTaxiId, limit]);

    return res.json({
      status: "ok",
      taxi_id: cleanTaxiId,
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