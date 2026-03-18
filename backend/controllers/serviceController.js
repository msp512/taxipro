import db from "../db.js";

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

    if (!taxi_id || !estimated_price || !meter_price) {
      return res.status(400).json({
        error: "missing required fields"
      });
    }

    // ===============================
    // DESVIACIÓN ENTRE ESTIMACIÓN Y REAL
    // ===============================

    const deviation =
      Number(
        (
          (meter_price - estimated_price) /
          estimated_price
        ).toFixed(4)
      );

    // ===============================
    // INSERTAR EN BASE DE DATOS
    // ===============================

    const query = `
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

    const values = [
      taxi_id,
      origin,
      destination,
      distance_km,
      duration_min,
      estimated_price,
      meter_price,
      deviation,
      city
    ];

    const result = await db.query(query, values);

    res.json({
      status: "ok",
      service: result.rows[0]
    });

  } catch (error) {

    console.error("Service register error:", error);

    res.status(500).json({
      error: "service registration failed"
    });

  }

}