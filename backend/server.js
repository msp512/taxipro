import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
//import compression from "compression";

import fareRoutes from "./routes/fareRoutes.js";
import techRoutes from "./routes/techRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import pilotRoutes from "./routes/pilotRoutes.js";

import { verifyJWT } from "./middleware/auth.js";
import db from "./db.js";
import logger from "./utils/logger.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
app.disable("x-powered-by");

// ================================
// PATH FIX
// ================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
// TRUST PROXY
// ================================
app.set("trust proxy", 1);

// ================================
// COMPRESIÓN
// ================================
//app.use(compression());

// ================================
// TIMEOUT GLOBAL
// ================================
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    logger.error("Timeout request", {
      path: req.originalUrl,
      method: req.method
    });
    res.status(504).json({ error: "Timeout" });
  });
  next();
});

// ================================
// CORS DEFINITIVO PRODUCCIÓN
// ================================
const allowedOrigins = [
  "https://taxipro-app.com",
  "https://www.taxipro-app.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin) return next();

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    logger.warn("CORS bloqueado", {
      origin,
      method: req.method,
      path: req.originalUrl
    });
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-taxi-code, x-device-id"
  );
  res.header("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ================================
// SEGURIDAD (HELMET)
// ================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://*.googleapis.com",
          "https://*.gstatic.com",
          "https://*.google.com",
          "blob:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.googleapis.com",
          "https://*.gstatic.com",
          "https://*.google.com",
          "https://*.googleusercontent.com"
        ],
        connectSrc: [
          "'self'",
          "https://taxipro.onrender.com",
          "https://taxipro-app.com",
          "https://www.taxipro-app.com",
          "https://*.googleapis.com",
          "https://*.gstatic.com",
          "https://*.google.com",
          "https://*.googleusercontent.com",
          "data:",
          "blob:"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:"
        ],
        frameSrc: [
          "https://*.google.com"
        ],
        workerSrc: [
          "'self'",
          "blob:"
        ]
      }
    }
  })
);

// ================================
// JSON PARSER
// ================================
app.use(express.json({ limit: "20kb" }));

// ================================
// RATE LIMIT
// ================================
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

// ================================
// STATIC FRONTEND
// ================================
app.use(express.static(path.join(__dirname, "../frontend/pwa")));

// ================================
// TEST DB
// ================================
db.query("SELECT NOW()")
  .then(res => logger.info("DB Connected: " + res.rows[0].now))
  .catch(err => logger.error("DB Error: " + err.message));

// ================================
// API ROUTES
// ================================
app.use("/api/pilot", pilotRoutes);
app.use("/api/fare", fareRoutes);
app.use("/api/city", cityRoutes);
app.use("/api/tech", verifyJWT, techRoutes);
app.use("/api/services", serviceRoutes);

// ================================
// SPA FALLBACK
// ================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pwa/index.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pwa/index.html"));
});

// ================================
// ERROR HANDLER
// ================================
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);

  res.status(err.status || 500).json({
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