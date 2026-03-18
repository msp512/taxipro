
import express from "express";
import { updateCityConfig } from "../controllers/cityController.js";

const router = express.Router();

router.post("/update", updateCityConfig);

export default router;