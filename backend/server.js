import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import fareRoutes from "./routes/fareRoutes.js";
import techRoutes from "./routes/techRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";

import { verifyJWT } from "./middleware/auth.js";
import db from "./db.js";
import { logger } from "./utils/logger.js";

const app = express();

// ================================
// PATH FIX (__dirname en ES modules)
// ================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
// TRUST PROXY
// ================================
app.set("trust proxy", 1);

// ================================
// SEGURIDAD
// ================================
app.use(helmet());

// ================================
// CORS (mejorado)
// ================================
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      "https://taxipro-app.com",
      "http://localhost:3000"
    ];

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  }
}));

// ================================
// PARSE JSON
// ================================
app.use(express.json());

// ================================
// RATE LIMIT (bien ubicado)
// ================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this device"
});

app.use("/api", apiLimiter);

// ================================
// STATIC FRONTEND (seguro)
// ================================
app.use(express.static(path.join(__dirname, "../frontend/pwa")));

// ================================
// TEST DB
// ================================
db.query("SELECT NOW()")
  .then(res => logger.info("DB Connected: " + res.rows[0].now))
  .catch(err => logger.error("DB Error: " + err));

// ================================
// RUTAS API
// ================================
app.use("/api/fare", fareRoutes);
app.use("/api/city", cityRoutes);

// 🔐 protegidas
app.use("/api/tech", verifyJWT, techRoutes);

// ⚠️ decide si proteger
app.use("/api/services", serviceRoutes);

// ================================
// ROOT
// ================================
app.get("/", (req, res) => {
  res.send("TAXIPRO TECH SERVER ACTIVE");
});

// ================================
// ERROR HANDLER (CRÍTICO)
// ================================
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error"
  });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Tech server running on port ${PORT}`);
});