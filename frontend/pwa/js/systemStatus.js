/* ===============================
   TAXIPRO SYSTEM STATUS v1.0
   =============================== */

function computeSystemStatus() {

  const metrics = computeSectorMetrics();

  if (!metrics || metrics.status === "no_data") {
    return {
      level: "grey",
      label: "Calibración inicial",
      explanation: "Sin datos suficientes"
    };
  }

  const total = metrics.totalValid;
  const within = parseFloat(metrics.withinTolerancePercent);
  const mean = Math.abs(parseFloat(metrics.meanDeviationPercent));
  const std = parseFloat(metrics.stdDeviationPercent);

  if (total < 100) {
    return {
      level: "yellow",
      label: "Calibración en curso",
      explanation: `${total} servicios válidos`
    };
  }

  if (within >= 85 && mean < 0.75 && std < 2) {
    return {
      level: "green",
      label: "Sistema estable",
      explanation: `${within}% dentro de tolerancia`
    };
  }

  if (mean >= 2) {
    return {
      level: "red",
      label: "Revisión técnica recomendada",
      explanation: `Desviación media ${mean}%`
    };
  }

  return {
    level: "yellow",
    label: "En observación",
    explanation: `Dentro tolerancia: ${within}%`
  };
}
let techMode = false;

export function enableTechMode() {

  techMode = true;

  localStorage.setItem("taxipro_tech_mode", "true");

  console.log("Modo técnico activado");

}

export function isTechMode() {

  return localStorage.getItem("taxipro_tech_mode") === "true";

}
const TECH_CODE = "5120";

export function activateTechMode(code) {

  if (code === TECH_CODE) {

    localStorage.setItem("taxipro_tech_mode", "true");

    return true;

  }

  return false;

}

export function isTechMode() {

  return localStorage.getItem("taxipro_tech_mode") === "true";

}