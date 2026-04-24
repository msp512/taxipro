import pool from "../db.js";

/**
 * Identifica el dispositivo (NO requiere que esté activo)
 */
export async function attachDevice(req, res, next) {
  try {
    const deviceId = req.headers["x-device-id"];

    if (!deviceId) {
      return res.status(401).json({
        ok: false,
        error: "device_id requerido"
      });
    }

    const result = await pool.query(
      "SELECT * FROM authorized_devices WHERE device_id = $1",
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Dispositivo no registrado",
        screen: "activation"
      });
    }

    req.device = result.rows[0];
    next();
  } catch (error) {
    console.error("attachDevice error:", error);
    res.status(500).json({
      ok: false,
      error: "Error identificando dispositivo"
    });
  }
}

/**
 * Requiere que el dispositivo esté activo
 */
export function requireAuthorizedDevice(req, res, next) {
  if (!req.device) {
    return res.status(401).json({
      ok: false,
      error: "Dispositivo no identificado"
    });
  }

  if (req.device.status !== "active") {
    return res.status(403).json({
      ok: false,
      error: "Dispositivo no activo",
      screen: "pending"
    });
  }

  next();
}

/**
 * Solo manager o superadmin
 */
export function requireManagerRole(req, res, next) {
  const role = req.device?.role;

  if (role !== "manager" && role !== "superadmin") {
    return res.status(403).json({
      ok: false,
      error: "Permiso de manager requerido"
    });
  }

  next();
}

/**
 * Solo superadmin
 */
export function requireSuperadminRole(req, res, next) {
  const role = req.device?.role;

  if (role !== "superadmin") {
    return res.status(403).json({
      ok: false,
      error: "Permiso de superadmin requerido"
    });
  }

  next();
}