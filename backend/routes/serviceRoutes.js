import express from "express";

import {
  registerService,
  getServicesByTaxi,
  exportServicesCSV
} from "../controllers/serviceController.js";

import {
  attachDevice,
  requireAuthorizedDevice,
  requireManagerRole
} from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.get("/", attachDevice, requireAuthorizedDevice, getServicesByTaxi);

router.post(
  "/register-service",
  attachDevice,
  requireAuthorizedDevice,
  registerService
);

router.get(
  "/export/csv",
  attachDevice,
  requireManagerRole,
  exportServicesCSV
);

export default router;