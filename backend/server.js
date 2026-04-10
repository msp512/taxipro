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

import dotenv from "dotenv";
dotenv.config();

const app = express();
app.disable("x-powered-by");

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
// CORS (VERSIÓN LIMPIA Y FUNCIONAL)
// ================================
const allowedOrigins = [
  "https://taxipro-app.com",
  "https://www.taxipro-app.com",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS bloqueado para origen: ${origin}`);
    return callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 204
};

// 🔥 IMPORTANTE: CORS antes de TODO
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ================================
// SEGURIDAD (helmet)
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
// PARSE JSON
// ================================
app.use(express.json({ limit: "20kb" }));

// ================================
// RATE LIMIT
// ================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" }
});

app.use("/api", apiLimiter);

// ================================
// STATIC FRONTEND
// ================================
app.use(express.static(path.join(__dirname, "../frontend/pwa")));

// ================================
// TEST DB
// ================================
db.query("SELECT NOW()")
  .then((res) => logger.info("DB Connected: " + res.rows[0].now))
  .catch((err) => logger.error("DB Error: " + err.message));

// ================================
// API ROUTES
// ================================
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
  res.status(500).json({
    error: err.message || "Internal Server Error"
  });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});