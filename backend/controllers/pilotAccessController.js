import pool from "../db.js";

/**
 * Obtener estado del dispositivo actual
 */
export async function getPilotMe(req, res) {
  try {
    const device = req.device;

    if (!device) {
      return res.status(401).json({
        ok: false,
        error: "Dispositivo no identificado"
      });
    }

    // Determinar pantalla que debe ver
    let screen = "blocked";

    if (device.role === "pending") {
      screen = "pending";
    } else if (device.status === "active" && device.taxi_code) {
      screen = "app";
    }

    res.json({
      ok: true,
      device: {
        device_id: device.device_id,
        display_name: device.display_name,
        role: device.role,
        status: device.status,
        taxi_code: device.taxi_code
      },
      screen
    });
  } catch (error) {
    console.error("Error en getPilotMe:", error);
    res.status(500).json({
      ok: false,
      error: "Error obteniendo estado del dispositivo"
    });
  }
}

/**
 * Activar dispositivo mediante código de invitación
 */
export async function activateWithInvite(req, res) {
  try {
    const { invite_code, display_name, device_id } = req.body;

    if (!invite_code || !display_name || !device_id) {
      return res.status(400).json({
        ok: false,
        error: "Datos incompletos"
      });
    }

    // Buscar invitación válida
    const inviteResult = await pool.query(
      `
      SELECT *
      FROM pilot_invites
      WHERE invite_code = $1
      AND is_active = true
      `,
      [invite_code]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "Código de invitación inválido"
      });
    }

    const invite = inviteResult.rows[0];

    // Insertar o actualizar dispositivo
    const result = await pool.query(
      `
      INSERT INTO authorized_devices (device_id, display_name, role, status, created_at)
      VALUES ($1, $2, 'pending', 'inactive', NOW())
      ON CONFLICT (device_id)
      DO UPDATE SET display_name = $2
      RETURNING *
      `,
      [device_id, display_name]
    );

    res.json({
      ok: true,
      device: result.rows[0]
    });
  } catch (error) {
    console.error("Error en activateWithInvite:", error);
    res.status(500).json({
      ok: false,
      error: "Error activando dispositivo"
    });
  }
}

/**
 * Asignar taxi a un dispositivo
 */
export async function assignTaxiToDevice(req, res) {
  try {
    const { device_id, taxi_code } = req.body;

    if (!device_id || !taxi_code) {
      return res.status(400).json({
        ok: false,
        error: "Datos incompletos"
      });
    }

    // 🔥 CORRECCIÓN IMPORTANTE AQUÍ
    const taxiResult = await pool.query(
      `
      SELECT *
      FROM authorized_taxis
      WHERE taxi_code = $1
      AND status = 'active'
      `,
      [taxi_code]
    );

    if (taxiResult.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "Taxi no autorizado o inactivo"
      });
    }

    await pool.query(
      `
      UPDATE authorized_devices
      SET taxi_code = $1
      WHERE device_id = $2
      `,
      [taxi_code, device_id]
    );

    res.json({
      ok: true,
      message: "Taxi asignado correctamente"
    });
  } catch (error) {
    console.error("Error en assignTaxiToDevice:", error);
    res.status(500).json({
      ok: false,
      error: "Error asignando taxi"
    });
  }
}
export async function getPilotDevices(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        device_id,
        display_name,
        role,
        status,
        taxi_code,
        created_at,
        updated_at
      FROM authorized_devices
      ORDER BY created_at DESC
    `);

    res.json({
      ok: true,
      devices: result.rows
    });
  } catch (error) {
    console.error("Error en getPilotDevices:", error);
    res.status(500).json({
      ok: false,
      error: "Error obteniendo dispositivos"
    });
  }
}

export async function updateDeviceRole(req, res) {
  try {
    const { device_id, role } = req.body;

    const allowedRoles = ["pending", "operator", "manager", "superadmin"];

    if (!device_id || !allowedRoles.includes(role)) {
      return res.status(400).json({
        ok: false,
        error: "Datos de rol no válidos"
      });
    }

    const result = await pool.query(
      `
      UPDATE authorized_devices
      SET role = $1, updated_at = NOW()
      WHERE device_id = $2
      RETURNING *
      `,
      [role, device_id]
    );

    res.json({
      ok: true,
      device: result.rows[0]
    });
  } catch (error) {
    console.error("Error en updateDeviceRole:", error);
    res.status(500).json({
      ok: false,
      error: "Error actualizando rol"
    });
  }
}

export async function updateDeviceStatus(req, res) {
  try {
    const { device_id, status } = req.body;

    const allowedStatus = ["active", "inactive", "blocked"];

    if (!device_id || !allowedStatus.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: "Datos de estado no válidos"
      });
    }

    const result = await pool.query(
      `
      UPDATE authorized_devices
      SET status = $1, updated_at = NOW()
      WHERE device_id = $2
      RETURNING *
      `,
      [status, device_id]
    );

    res.json({
      ok: true,
      device: result.rows[0]
    });
  } catch (error) {
    console.error("Error en updateDeviceStatus:", error);
    res.status(500).json({
      ok: false,
      error: "Error actualizando estado"
    });
  }
}