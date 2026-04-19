import express from "express";
import {
  activatePilotDevice,
  getPilotDevices,
  deactivatePilotDevice,
  activateExistingPilotDevice
} from "../controllers/pilotController.js";

import {
  requireAuthorizedDevice,
  requireAdminRole
} from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.post("/activate", activatePilotDevice);

router.get("/devices", requireAuthorizedDevice, requireAdminRole, getPilotDevices);
router.post("/device/deactivate", requireAuthorizedDevice, requireAdminRole, deactivatePilotDevice);
router.post("/device/activate", requireAuthorizedDevice, requireAdminRole, activateExistingPilotDevice);

export default router;