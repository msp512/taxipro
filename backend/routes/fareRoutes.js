import express from "express";
import { estimateFare } from "../controllers/fareController.js";

const router = express.Router();

// ================================
// VALIDACIÓN BÁSICA
// ================================
const validateEstimateRequest = (req, res, next) => {
  const { distance, duration, city } = req.body;

  if (
    distance === undefined ||
    duration === undefined ||
    !city
  ) {
    return res.status(400).json({
  error: "CAMBIO OK BACKEND"
});
  }

  next();
};

// ================================
// ROUTES
// ================================
router.post("/estimate", validateEstimateRequest, estimateFare);

export default router;