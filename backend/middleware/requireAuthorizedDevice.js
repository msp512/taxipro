import db from "../db.js";

function normalizeValue(value) {
  return value ? String(value).trim() : "";
}

function normalizeTaxiCode(value) {
  return normalizeValue(value).toUpperCase();
}

function normalizeStatus(value) {
  return normalizeValue(value).toLowerCase();
}

function isActiveStatus(status) {
  return normalizeStatus(status) === "active";
}

function extractTaxiCode(req) {
  return normalizeTaxiCode(
    req.headers["x-taxi-code"] ||
      req.body?.taxi_code ||
      req.body?.taxi_id ||
      req.query?.taxi_code ||
      req.query?.taxi_id
  );
}

function extractDeviceId(req) {
  return normalizeValue(
    req.headers["x-device-id"] ||
      req.body?.device_id ||
      req.query?.device_id
  );
}

export async function requireAuthorizedDevice(req, res, next) {
  try {
    const taxiCode = extractTaxiCode(req);
    const deviceId = extractDeviceId(req);

    if (!taxiCode) {
      return res.status(401).json({
        error: "taxi_code required"
      });
    }

    if (!deviceId) {
      return res.status(401).json({
        error: "device_id required"
      });
    }

    const result = await db.query(
      `
      select
        t.taxi_code,
        t.status as taxi_status,
        d.device_id,
        d.device_name,
        d.role,
        d.status as device_status
      from authorized_taxis t
      join authorized_devices d
        on d.taxi_code = t.taxi_code
      where t.taxi_code = $1
        and d.device_id = $2
      limit 1
      `,
      [taxiCode, deviceId]
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(403).json({
        error: "device not authorized for this taxi"
      });
    }

    if (!isActiveStatus(row.taxi_status)) {
      return res.status(403).json({
        error: "taxi not active"
      });
    }

    if (!isActiveStatus(row.device_status)) {
      return res.status(403).json({
        error: "device not active"
      });
    }

    await db.query(
      `
      update authorized_devices
      set last_used_at = now(),
          updated_at = now()
      where device_id = $1
      `,
      [deviceId]
    );

    req.authPilot = {
      taxiCode: row.taxi_code,
      deviceId: row.device_id,
      deviceName: row.device_name,
      role: row.role
    };

    next();
  } catch (error) {
    console.error("Device authorization middleware error:", error);

    return res.status(500).json({
      error: "device authorization failed",
      detail: error.message
    });
  }
}

export function requireAdminRole(req, res, next) {
  const role = req.authPilot?.role;

  if (role !== "admin") {
    return res.status(403).json({
      error: "admin role required"
    });
  }

  next();
}