import db from "../db.js";

function normalizeValue(value) {
  return value ? String(value).trim() : "";
}

function normalizeTaxiCode(value) {
  return normalizeValue(value).toUpperCase();
}

function normalizeRole(value) {
  return normalizeValue(value).toLowerCase();
}

function isActiveStatus(status) {
  return normalizeRole(status) === "active";
}

function getAllowedRole(inputRole) {
  const role = normalizeRole(inputRole || "operator");
  return role === "admin" ? "admin" : "operator";
}

export async function activatePilotDevice(req, res) {
  try {
    const taxiCode = normalizeTaxiCode(req.body?.taxi_code || req.body?.taxi_id);
    const deviceId = normalizeValue(req.body?.device_id);
    const deviceName = normalizeValue(req.body?.device_name);
    const requestedRole = getAllowedRole(req.body?.role);
    const activationKey = normalizeValue(req.body?.activation_key);

    if (!taxiCode) {
      return res.status(400).json({
        error: "taxi_code required"
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        error: "device_id required"
      });
    }

    if (!activationKey) {
      return res.status(403).json({
        error: "activation key required"
      });
    }

    if (activationKey !== process.env.PILOT_ACTIVATION_KEY) {
      return res.status(403).json({
        error: "invalid activation key"
      });
    }

    const taxiResult = await db.query(
      `
      select taxi_code, status
      from authorized_taxis
      where taxi_code = $1
      limit 1
      `,
      [taxiCode]
    );

    const taxi = taxiResult.rows[0];

    if (!taxi) {
      return res.status(403).json({
        error: "taxi not authorized for pilot"
      });
    }

    if (!isActiveStatus(taxi.status)) {
      return res.status(403).json({
        error: "taxi not active"
      });
    }

    const existingDevice = await db.query(
      `
      select id, taxi_code
      from authorized_devices
      where device_id = $1
      limit 1
      `,
      [deviceId]
    );

    const current = existingDevice.rows[0];

    if (current && current.taxi_code !== taxiCode) {
      return res.status(403).json({
        error: "device already linked to another taxi"
      });
    }

    const result = await db.query(
      `
      insert into authorized_devices (
        taxi_code,
        device_id,
        device_name,
        role,
        status,
        first_activated_at,
        last_used_at,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, 'active', now(), now(), now(), now())
      on conflict (device_id)
      do update set
        taxi_code = excluded.taxi_code,
        device_name = excluded.device_name,
        role = excluded.role,
        status = 'active',
        last_used_at = now(),
        updated_at = now()
      returning taxi_code, device_id, device_name, role, status
      `,
      [taxiCode, deviceId, deviceName || null, requestedRole]
    );

    return res.json({
      ok: true,
      activation: result.rows[0]
    });
  } catch (error) {
    console.error("Pilot activation error:", error);

    return res.status(500).json({
      error: "pilot activation failed",
      detail: error.message
    });
  }
}