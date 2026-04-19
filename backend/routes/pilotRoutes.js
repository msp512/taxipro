import express from "express";
import {
  activatePilotDevice,
  getPilotDevices,
  deactivatePilotDevice
} from "../controllers/pilotController.js";

import {
  requireAuthorizedDevice,
  requireAdminRole
} from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

// Activación (pública con clave)
router.post("/activate", activatePilotDevice);

// 🔒 Requieren dispositivo autorizado
router.get("/devices", requireAuthorizedDevice, requireAdminRole, getPilotDevices);
router.post("/device/deactivate", requireAuthorizedDevice, requireAdminRole, deactivatePilotDevice);

export default router;