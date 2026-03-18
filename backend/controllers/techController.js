import { supabase } from "../config/supabase.config.js";
import { calculateCalibration } from "../core/calibrationEngine.js";

// ========================================
// ESTADÍSTICAS DEL SISTEMA
// ========================================

export async function getSystemStats(req, res) {

  try {

    const { data, error } = await supabase
      .from("services")
      .select("deviation");

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    const totalServices = data.length;

    if (totalServices === 0) {
      return res.json({
        total_services: 0,
        avg_deviation: 0,
        std_deviation: 0,
        accuracy: 0
      });
    }

    // ==========================
    // DESVIACIÓN MEDIA
    // ==========================

    const deviations = data.map(row =>
      Math.abs(row.deviation || 0)
    );

    const sumDeviation =
      deviations.reduce((acc, val) => acc + val, 0);

    const avgDeviation =
      sumDeviation / totalServices;

    // ==========================
    // DESVIACIÓN ESTÁNDAR
    // ==========================

    const variance =
      deviations.reduce(
        (acc, val) =>
          acc + Math.pow(val - avgDeviation, 2),
        0
      ) / totalServices;

    const stdDeviation =
      Math.sqrt(variance);

    // ==========================
    // PRECISIÓN DEL SISTEMA
    // ==========================

    const accuracy =
      Math.max(
        0,
        100 - (avgDeviation * 100)
      );

    // ==========================
    // RESPUESTA
    // ==========================

    res.json({
      total_services: totalServices,
      avg_deviation: Number(avgDeviation.toFixed(4)),
      std_deviation: Number(stdDeviation.toFixed(4)),
      accuracy: Number(accuracy.toFixed(2))
    });

  } catch (err) {

    console.error("System stats error:", err);

    res.status(500).json({
      error: "Error obteniendo estadísticas"
    });

  }

}

// ========================================
// CALIBRACIÓN DEL SISTEMA
// ========================================

export async function getCalibration(req, res) {

  try {

    const calibration = await calculateCalibration();

    if (!calibration) {
      return res.json({
        message: "No hay datos suficientes"
      });
    }

    res.json(calibration);

  } catch (error) {

    console.error("Calibration error:", error);

    res.status(500).json({
      error: "Error calculando calibración"
    });

  }

}