import express from "express";
import {
  registerService,
  getServicesByTaxi
} from "../controllers/serviceController.js";
import { requireAuthorizedDevice } from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.get("/", requireAuthorizedDevice, getServicesByTaxi);
router.post("/register-service", requireAuthorizedDevice, registerService);

export default router;