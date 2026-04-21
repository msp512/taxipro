import express from "express";

import {
  activatePilotDevice,
  getPilotDevices,
  deactivatePilotDevice,
  activateExistingPilotDevice,
  getCurrentPilotDevice,
  updatePilotDeviceRole,
  renamePilotDevice
} from "../controllers/pilotController.js";

import {
  requireAuthorizedDevice,
  requireAdminRole
} from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.post("/activate", activatePilotDevice);

router.get("/me", requireAuthorizedDevice, getCurrentPilotDevice);

router.get("/devices", requireAuthorizedDevice, requireAdminRole, getPilotDevices);

router.post("/device/activate", requireAuthorizedDevice, requireAdminRole, activateExistingPilotDevice);

router.post("/device/deactivate", requireAuthorizedDevice, requireAdminRole, deactivatePilotDevice);

router.post("/device/role", requireAuthorizedDevice, requireAdminRole, updatePilotDeviceRole);

router.post("/device/rename", requireAuthorizedDevice, requireAdminRole, renamePilotDevice);

export default router;