import express from "express";
import {
  registerService,
  getServicesByTaxi
} from "../controllers/serviceController.js";
import {
  attachDevice,
  requireAuthorizedDevice
} from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.get("/", attachDevice, requireAuthorizedDevice, getServicesByTaxi);
router.post("/register-service", attachDevice, requireAuthorizedDevice, registerService);

export default router;