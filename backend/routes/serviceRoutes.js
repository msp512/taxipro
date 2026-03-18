import express from "express";
import { registerService } from "../controllers/serviceController.js";

const router = express.Router();

router.post("/register-service", registerService);

export default router;