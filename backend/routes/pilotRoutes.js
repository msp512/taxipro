import express from "express";
import { activatePilotDevice } from "../controllers/pilotController.js";

const router = express.Router();

router.post("/activate", activatePilotDevice);

export default router;