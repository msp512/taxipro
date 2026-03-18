import express from "express";
import { getSystemStats } from "../controllers/techController.js";

const router = express.Router();

router.get("/system-stats", getSystemStats);

export default router;