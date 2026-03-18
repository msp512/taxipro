export function showPriceResult(data) {

const estimated = document.getElementById("estimatedPrice");
const range = document.getElementById("priceRange");
const distance = document.getElementById("distanceValue");
const duration = document.getElementById("durationValue");
const confidence = document.querySelector(".confidence-indicator");
const result = document.getElementById("resultSection");

if (!data || typeof data.price !== "number" || !data.interval) {
console.error("Datos inválidos:", data);
return;
}

const price = data.price.toFixed(2);
const min = data.interval.min.toFixed(2);
const max = data.interval.max.toFixed(2);

estimated.innerText = price + " €";
range.innerText = min + " - " + max + " €";

if (data.distanceKm != null) {
distance.innerText = data.distanceKm.toFixed(1) + " km";
}

if (data.durationMinutes != null) {
duration.innerText = Math.round(data.durationMinutes) + " min";
}

if (data.confidence != null) {
confidence.innerText = "Precisión estimada " + data.confidence + "%";
}

result.classList.remove("hidden");

estimated.classList.remove("price-animate");
void estimated.offsetWidth;
estimated.classList.add("price-animate");
}

// ===============================
// HISTORIAL
// ===============================
export function renderHistory(services) {

const panel = document.getElementById("historyPanel");
const list = document.getElementById("historyList");

if (!services || !services.length) return;

panel.classList.remove("hidden");
list.innerHTML = "";

services.slice(-10).reverse().forEach(service => {

```
if (!service.real_total || !service.estimated_total) return;

const deviation =
  ((service.real_total - service.estimated_total)
  / service.estimated_total) * 100;

const item = document.createElement("div");
item.className = "history-item";

const deviationClass =
  deviation > 0
    ? "history-deviation-positive"
    : "history-deviation-negative";

item.innerHTML =
  "<div>Estimado: " + service.estimated_total.toFixed(2) + " €</div>" +
  "<div>Real: " + service.real_total.toFixed(2) + " €</div>" +
  "<div class='" + deviationClass + "'>Desviación: " + deviation.toFixed(2) + " %</div>";

list.appendChild(item);
```

});
}

// ===============================
// ESTADÍSTICAS PILOTO
// ===============================
export function updatePilotStats() {

const trips =
JSON.parse(localStorage.getItem("taxipro_trips") || "[]");

if (!trips.length) return;

const services = document.getElementById("pilotServices");
const deviation = document.getElementById("pilotDeviation");
const best = document.getElementById("pilotBest");
const worst = document.getElementById("pilotWorst");
const calibration = document.getElementById("pilotCalibration");

let deviations = [];
let completed = 0;

trips.forEach(t => {

```
const est = parseFloat(t.estimated_total);
const real = parseFloat(t.real_total);

if (!est || !real) return;

completed++;

const dev =
  ((real - est) / est) * 100;

deviations.push(dev);
```

});

if (deviations.length === 0) {
deviation.innerText = "Desviación media: --";
best.innerText = "Mejor: --";
worst.innerText = "Peor: --";
return;
}

const avg =
deviations.reduce((a, b) => a + b, 0) /
deviations.length;

services.innerText = "Servicios: " + completed;
deviation.innerText = "Desviación media: " + avg.toFixed(1) + " %";
best.innerText = "Mejor: " + Math.min(...deviations).toFixed(1) + " %";
worst.innerText = "Peor: " + Math.max(...deviations).toFixed(1) + " %";
calibration.innerText = "Calibración: " + completed + " / 100";
}
