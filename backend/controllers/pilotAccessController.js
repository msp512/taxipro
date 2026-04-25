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
    const inviteCode = String(
      req.body.invite_code || req.body.code || ""
    ).trim().toUpperCase();

    const deviceId = String(
      req.body.device_id || req.headers["x-device-id"] || ""
    ).trim();

    const displayName = String(
      req.body.display_name ||
      req.body.device_name ||
      deviceId ||
      "Dispositivo TAXIPRO"
    ).trim();

    if (!inviteCode || !deviceId) {
      return res.status(400).json({
        ok: false,
        error: "Datos incompletos"
      });
    }

    const inviteResult = await pool.query(
      `
      SELECT *
      FROM pilot_invites
      WHERE invite_code = $1
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      `,
      [inviteCode]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "Código de invitación inválido o caducado"
      });
    }

    const invite = inviteResult.rows[0];

    const role = invite.requires_approval
      ? "pending"
      : invite.target_role || "operator";

    const status = invite.requires_approval
      ? "inactive"
      : "active";

    const result = await pool.query(
      `
      INSERT INTO authorized_devices (
        device_id,
        display_name,
        role,
        status,
        taxi_code,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (device_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        updated_at = NOW()
      RETURNING *
      `,
      [
        deviceId,
        displayName,
        role,
        status,
        invite.target_taxi_code || null
      ]
    );

    await pool.query(
      `
      UPDATE pilot_invites
      SET used_by_device_id = $1,
          used_at = NOW(),
          is_active = false
      WHERE invite_code = $2
      `,
      [deviceId, inviteCode]
    );

    res.json({
      ok: true,
      device: result.rows[0]
    });

  } catch (error) {
    console.error("activateWithInvite error:", error);
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
export async function createInvite(req, res) {
  try {
    const {
      target_role = "operator",
      target_taxi_code = null,
      requires_approval = true
    } = req.body;

    const code =
      "TAXI-" +
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const result = await pool.query(
      `
      INSERT INTO pilot_invites (
        invite_code,
        created_by_device_id,
        target_role,
        target_taxi_code,
        requires_approval,
        is_active,
        expires_at,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,true,$6,NOW())
      RETURNING invite_code
      `,
      [
        code,
        req.device.device_id,
        target_role,
        target_taxi_code,
        requires_approval,
        expiresAt
      ]
    );

    res.json({
      ok: true,
      invite_code: result.rows[0].invite_code
    });

  } catch (error) {
    console.error("createInvite error:", error);
    res.status(500).json({ ok: false, error: "Error creando invitación" });
  }
}