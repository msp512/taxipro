import express from "express";
import { estimateFare } from "../controllers/fareController.js";

const router = express.Router();

/*
  TAXIPRO — cálculo de tarifa
  El cálculo debe funcionar aunque el módulo PILOTO no esté disponible
  o el dispositivo todavía no esté registrado.
*/
router.post("/estimate", estimateFare);

export default router;