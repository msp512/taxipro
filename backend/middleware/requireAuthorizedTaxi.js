import db from "../db.js";

function normalizeTaxiCode(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function isActiveTaxiStatus(status) {
  return String(status || "").trim().toLowerCase() === "active";
}

export async function requireAuthorizedTaxi(req, res, next) {
  try {
    const headerTaxiCode = req.headers["x-taxi-code"];
    const bodyTaxiCode = req.body?.taxi_code || req.body?.taxi_id;
    const queryTaxiCode = req.query?.taxi_code || req.query?.taxi_id;

    const cleanTaxiCode = normalizeTaxiCode(
      headerTaxiCode || bodyTaxiCode || queryTaxiCode
    );

    if (!cleanTaxiCode) {
      return res.status(401).json({
        error: "taxi_code required"
      });
    }

    const result = await db.query(
      `
      SELECT taxi_code, status
      FROM authorized_taxis
      WHERE taxi_code = $1
      LIMIT 1
      `,
      [cleanTaxiCode]
    );

    const taxi = result.rows[0];

    if (!taxi) {
      return res.status(403).json({
        error: "taxi not authorized for pilot"
      });
    }

    if (!isActiveTaxiStatus(taxi.status)) {
      return res.status(403).json({
        error: "taxi not active"
      });
    }

    req.authorizedTaxiCode = cleanTaxiCode;
    next();
  } catch (error) {
    console.error("Authorization middleware error:", error);
    return res.status(500).json({
      error: "authorization check failed",
      detail: error.message
    });
  }
}