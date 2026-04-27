import express from "express";
import { estimateFare } from "../controllers/fareController.js";
import {
  attachDevice,
  requireAuthorizedDevice
} from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.post("/estimate", attachDevice, requireAuthorizedDevice, estimateFare);

export default router;