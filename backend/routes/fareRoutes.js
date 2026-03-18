import express from "express";
import { estimateFare } from "../controllers/fareController.js";

const router = express.Router();

// ================================
// VALIDACIÓN BÁSICA
// ================================
const validateEstimateRequest = (req, res, next) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({
      error: "origin and destination are required"
    });
  }

  next();
};

// ================================
// ROUTES
// ================================
router.post("/estimate", validateEstimateRequest, estimateFare);

export default router;