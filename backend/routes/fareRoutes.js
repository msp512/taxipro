import express from "express";
import { estimateFare } from "../controllers/fareController.js";
import { requireAuthorizedDevice } from "../middleware/requireAuthorizedDevice.js";

const router = express.Router();

router.post("/estimate", requireAuthorizedDevice, estimateFare);

export default router;