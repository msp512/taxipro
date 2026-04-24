import pool from "../db.js";

/**
 * Middleware para validar que el dispositivo existe y está activo
 * Usa header: x-device-id
 */
export async function requireAuthorizedDevice(req, res, next) {
  try {
    const deviceId = req.headers["x-device-id"];

    if (!deviceId) {
      return res.status(401).json({
        ok: false,
        error: "device_id requerido"
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM authorized_devices
      WHERE device_id = $1
      `,
      [deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "Dispositivo no autorizado"
      });
    }

    const device = result.rows[0];

    if (device.status !== "active") {
      return res.status(403).json({
        ok: false,
        error: "Dispositivo no activo"
      });
    }

    // Guardamos el dispositivo en request para uso posterior
    req.device = device;

    next();
  } catch (error) {
    console.error("Error en requireAuthorizedDevice:", error);
    res.status(500).json({
      ok: false,
      error: "Error validando dispositivo"
    });
  }
}