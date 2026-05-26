import express from "express";

import {
  attachDevice,
  requireManagerRole,
  requireSuperadminRole
} from "../middleware/requireAuthorizedDevice.js";

import {
  getPilotMe,
  activateWithInvite,
  getPilotDevices,
  updateDeviceRole,
  updateDeviceStatus,
  assignTaxiToDevice,
  createInvite,
  updatePilotDevice
} from "../controllers/pilotAccessController.js";

const router = express.Router();

router.get("/me", attachDevice, getPilotMe);

router.post("/activate-invite", activateWithInvite);

router.get("/devices", attachDevice, requireManagerRole, getPilotDevices);

router.patch("/device/:deviceId", attachDevice, requireManagerRole, updatePilotDevice);

router.post("/device/role", attachDevice, requireManagerRole, updateDeviceRole);

router.post("/device/status", attachDevice, requireManagerRole, updateDeviceStatus);

router.post("/device/assign-taxi", attachDevice, requireManagerRole, assignTaxiToDevice);

/*
  TAXIPRO — piloto inicial
  Solo superadmin crea invitaciones. Dejamos dos rutas para compatibilidad
  con frontend existente y con el nombre nuevo aprobado en B3.2.
*/
router.post("/invites", attachDevice, requireSuperadminRole, createInvite);
router.post("/invite/create", attachDevice, requireSuperadminRole, createInvite);

export default router;