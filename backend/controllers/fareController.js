import { calculateAverageSpeed } from "../core/trafficAnalyzer.js";
import { calculateConfidence } from "../core/confidenceEngine.js";
import { fareSchema } from "../validation/fareSchema.js";
import logger from "../utils/logger.js";

export function estimateFare(req, res) {
  try {
    const parsed = fareSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors
      });
    }

    const { distance, duration, city, supplements = [] } = parsed.data;
    const start = Date.now();

    // ==============================
    // 1. VELOCIDAD MEDIA
    // ==============================
    const speed = calculateAverageSpeed(
      distance * 1000,
      duration * 60
    );

    if (!speed) {
      return res.status(400).json({
        error: "invalid speed calculation"
      });
    }

    // ==============================
    // 2. TARIFAS REALES
    // ==============================
    const tariff = {
      baseFare: 2.50,
      priceKm: 1.20,
      priceMinute: 19.40 / 60
    };

    // ==============================
    // 3. SUPLEMENTOS
    // ==============================
    const supplementValues = {
      airport: 4.65,
      radio: 1.15,
      christmas: 4.75,
      pax56: 3.00,
      pax78: 6.00,
      mountain1: 8.52,
      mountain2: 4.26
    };

    const supplementsTotal = supplements.reduce((sum, key) => {
      return sum + (supplementValues[key] || 0);
    }, 0);

    // ==============================
    // 4. CÁLCULO TIPO TAXÍMETRO REAL
    // ==============================
    let price = tariff.baseFare;

    if (speed >= 18) {
      // carretera → SOLO distancia
      price += distance * tariff.priceKm;

    } else {
      // urbano → mezcla controlada
      let factor = 0;

      if (speed < 15) factor = 0.25;
      else factor = 0.12;

      const effectiveTime = duration * factor;

      price += distance * tariff.priceKm;
      price += effectiveTime * tariff.priceMinute;
    }

    // ==============================
    // 5. SUPLEMENTOS
    // ==============================
    price += supplementsTotal;

    // ==============================
    // 6. REDONDEO
    // ==============================
    price = Number(price.toFixed(2));

    const durationMs = Date.now() - start;

    logger.info({ durationMs }, "Fare calculation time");

    // ==============================
    // 7. CONFIANZA
    // ==============================
    const confidence = calculateConfidence(distance, duration, speed);

    // ==============================
    // 8. MARGEN
    // ==============================
    let margin = 0.06;

    if (speed < 15) margin = 0.12;
    else if (speed < 25) margin = 0.08;
    else if (speed > 40) margin = 0.03;

    const minPrice = Number((price * (1 - margin)).toFixed(2));
    const maxPrice = Number((price * (1 + margin)).toFixed(2));

    // ==============================
    // 9. RESPUESTA
    // ==============================
    res.json({
      price,
      interval: {
        min: minPrice,
        max: maxPrice
      },
      confidence,
      supplements: {
        selected: supplements,
        total: supplementsTotal
      },
      meta: {
        speed,
        city
      }
    });

  } catch (error) {
    logger.error(error, "Fare calculation error");

    res.status(500).json({
      error: "fare calculation failed"
    });
  }
}