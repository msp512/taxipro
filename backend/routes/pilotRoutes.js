import express from "express";

import {
  attachDevice,
  requireManagerRole
} from "../middleware/requireAuthorizedDevice.js";

import {
  getPilotMe,
  activateWithInvite,
  getPilotDevices,
  updateDeviceRole,
  updateDeviceStatus,
  assignTaxiToDevice
} from "../controllers/pilotAccessController.js";

import { createInvite } from "../controllers/pilotAccessController.js";

const router = express.Router();

router.get("/me", attachDevice, getPilotMe);

router.post("/activate-invite", activateWithInvite);

router.get("/devices", attachDevice, requireManagerRole, getPilotDevices);

router.post("/device/role", attachDevice, requireManagerRole, updateDeviceRole);

router.post("/device/status", attachDevice, requireManagerRole, updateDeviceStatus);

router.post("/device/assign-taxi", attachDevice, requireManagerRole, assignTaxiToDevice);

router.post(
  "/invite/create",
  attachDevice,
  requireManagerRole,
  createInvite
);

export default router;