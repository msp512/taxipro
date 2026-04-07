import express from "express";
import {
  registerService,
  getServicesByTaxi
} from "../controllers/serviceController.js";

const router = express.Router();

router.get("/", getServicesByTaxi);
router.post("/register-service", registerService);

export default router;