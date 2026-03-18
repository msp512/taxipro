import { calculateAverageSpeed } from "../core/trafficAnalyzer.js";
import { calculateDragFactor } from "../core/dragFactorEngine.js";
import { calculateConfidence } from "../core/confidenceEngine.js";
import { calculateFare } from "../core/fareEngine.js";
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

    const { distance, duration, city } = parsed.data;

    const start = Date.now();

    // ===============================
    // VELOCIDAD MEDIA
    // ===============================
    const speed = calculateAverageSpeed(
      distance * 1000,
      duration * 60
    );
    if (!speed) {
  return res.status(400).json({
    error: "invalid speed calculation"
  });
}

    // ===============================
    // FACTOR DE ARRASTRE
    // ===============================
    const dragFactor = calculateDragFactor(speed);

    // ===============================
    // TARIFAS POR DEFECTO (TEMPORAL)
    // ===============================
    const tariff = {
      baseFare: 3.15,
      priceKm: 1.21,
      priceMinute: 0.40
    };

    // ===============================
    // CÁLCULO TARIFA
    // ===============================
    const fareResult = calculateFare({
      baseFare: tariff.baseFare,
      distanceKm: distance,
      priceKm: tariff.priceKm,
      durationMinutes: duration,
      priceMinute: tariff.priceMinute,
      dragFactor,
      supplements: 0
    });

    const price = fareResult.total;

    const durationMs = Date.now() - start;

    logger.info({ durationMs }, "Fare calculation time");

    // ===============================
// CONFIANZA DEL CÁLCULO
// ===============================

const confidence = calculateConfidence(distance, duration, speed);
    // INTERVALO DINÁMICO (MEJORADO)
    // ===============================
    let margin = 0.06;

    if (speed < 15) margin = 0.10;       // tráfico denso
    else if (speed > 40) margin = 0.04;  // vía rápida

    const minPrice = Number((price * (1 - margin)).toFixed(2));
    const maxPrice = Number((price * (1 + margin)).toFixed(2));

    // ===============================
    // RESPUESTA
    // ===============================
    res.json({
      price,
      interval: {
        min: minPrice,
        max: maxPrice
      },
      confidence,

      // 🔧 DEBUG (eliminable en producción)
      meta: {
        speed,
        dragFactor,
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