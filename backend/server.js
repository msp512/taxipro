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
import logger from "./utils/logger.js";

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
// SEGURIDAD (helmet con CSP)
// ================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://maps.gstatic.com"
        ],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://taxipro.onrender.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  })
);

// ================================
// CORS
// ================================
app.use(
  cors({
    origin: [
      "https://taxipro.onrender.com",
      "http://localhost:3000"
    ]
  })
);

// ================================
// PARSE JSON
// ================================
app.use(express.json());

// ================================
// RATE LIMIT
// ================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests"
});

app.use("/api", apiLimiter);

// ================================
// STATIC FRONTEND
// ================================
app.use(
  express.static(
    path.join(__dirname, "../frontend/pwa")
  )
);

// ================================
// TEST DB
// ================================
db.query("SELECT NOW()")
  .then((res) =>
    logger.info("DB Connected: " + res.rows[0].now)
  )
  .catch((err) =>
    logger.error("DB Error: " + err)
  );

// ================================
// API ROUTES
// ================================
app.use("/api/fare", fareRoutes);
app.use("/api/city", cityRoutes);
app.use("/api/tech", verifyJWT, techRoutes);
app.use("/api/services", serviceRoutes);

// ================================
// SPA FALLBACK (MUY IMPORTANTE)
// ================================
app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/pwa/index.html")
  );
});

// ================================
// ERROR HANDLER
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
  logger.info(`Server running on port ${PORT}`);
});