export function showPriceResult(data) {
  const estimated = document.getElementById("estimatedPrice");
  const range = document.getElementById("priceRange");
  const distance = document.getElementById("distanceValue");
  const duration = document.getElementById("durationValue");
  const confidence = document.querySelector(".confidence-indicator");
  const trafficStatus = document.querySelector(".traffic-status");
  const result = document.getElementById("resultSection");
  const estimationTitle = document.getElementById("estimationTitle");

  if (!data || typeof data.price !== "number" || !data.interval) {
    console.error("Datos inválidos:", data);
    return;
  }

  const isFixed = !!data.isFixedTariff;
  const modeLabel = data.modeLabel || "Tarifa fija";

  if (estimationTitle) {
    estimationTitle.innerText = isFixed ? modeLabel : "Estimación TaxiPro";
  }

  estimated.innerText = data.price.toFixed(2) + " €";
  range.innerText = `${data.interval.min.toFixed(2)} – ${data.interval.max.toFixed(2)} €`;

  if (distance) {
    if (data.distanceKm != null && data.distanceKm > 0) {
      distance.innerText = data.distanceKm.toFixed(1) + " km";
    } else {
      distance.innerText = isFixed ? "Tarifa fija" : "-- km";
    }
  }

  if (duration) {
    if (data.durationMinutes != null && data.durationMinutes > 0) {
      duration.innerText = Math.round(data.durationMinutes) + " min";
    } else {
      duration.innerText = isFixed ? modeLabel : "-- min";
    }
  }

  if (confidence) {
    if (isFixed) {
      confidence.innerText = modeLabel;
    } else if (data.confidence != null) {
      confidence.innerText = "Precisión estimada: " + data.confidence + "%";
    } else {
      confidence.innerText = "Precisión estimada --";
    }
  }

  if (trafficStatus) {
    trafficStatus.innerText = isFixed
  ? "Precio concertado"
  : "Tráfico actual analizado";
  }

  result?.classList.remove("hidden");

  if (estimated) {
    estimated.classList.remove("price-animate");
    void estimated.offsetWidth;
    estimated.classList.add("price-animate");
  }
}

export function renderHistory(services) {
  const panel = document.getElementById("historyPanel");
  const list = document.getElementById("historyList");

  if (!panel || !list) return;

  if (!services || !services.length) {
    panel.classList.add("hidden");
    list.innerHTML = "";
    return;
  }

  const completed = services.filter((service) => {
    const estimated = Number(service.estimated_price);
    const real = Number(service.meter_price);

    return Number.isFinite(estimated) && estimated > 0 &&
           Number.isFinite(real) && real > 0;
  });

  if (!completed.length) {
    panel.classList.add("hidden");
    list.innerHTML = "";
    return;
  }

  panel.classList.remove("hidden");
  list.innerHTML = "";

  completed.slice(0, 10).forEach((service) => {
    const estimated = Number(service.estimated_price);
    const real = Number(service.meter_price);
    const deviation = Number.isFinite(Number(service.deviation))
      ? Number(service.deviation) * 100
      : ((real - estimated) / estimated) * 100;

    const item = document.createElement("div");
    item.className = "history-item";

    const deviationClass = deviation > 0
      ? "history-deviation-positive"
      : "history-deviation-negative";

    const destLabel = service.destination
      ? `<div style="font-size:0.8rem;color:#9ca3af;margin-bottom:4px">${service.destination}</div>`
      : "";

    item.innerHTML =
      destLabel +
      `<div>Estimado: ${estimated.toFixed(2)} €</div>` +
      `<div>Real: ${real.toFixed(2)} €</div>` +
      `<div class="${deviationClass}">Desviación: ${deviation.toFixed(1)} %</div>`;

    list.appendChild(item);
  });
}

export function updatePilotStats(servicesFromDb = []) {
  const services = document.getElementById("pilotServices");
  const deviation = document.getElementById("pilotDeviation");
  const best = document.getElementById("pilotBest");
  const worst = document.getElementById("pilotWorst");
  const calibration = document.getElementById("pilotCalibration");

  if (!services || !deviation || !best || !worst || !calibration) return;

  if (!servicesFromDb || !servicesFromDb.length) {
    services.innerText = "Servicios: 0";
    deviation.innerText = "Desviación media: --";
    best.innerText = "Mejor: --";
    worst.innerText = "Peor: --";
    calibration.innerText = "Calibración: 0 / 100";
    return;
  }

  const deviations = [];

  servicesFromDb.forEach((service) => {
    const estimated = Number(service.estimated_price);
    const real = Number(service.meter_price);

    if (!Number.isFinite(estimated) || estimated <= 0) return;
    if (!Number.isFinite(real) || real <= 0) return;

    const deviationPercent = Number.isFinite(Number(service.deviation))
      ? Number(service.deviation) * 100
      : ((real - estimated) / estimated) * 100;

    deviations.push(deviationPercent);
  });

  if (!deviations.length) {
    services.innerText = "Servicios: 0";
    deviation.innerText = "Desviación media: --";
    best.innerText = "Mejor: --";
    worst.innerText = "Peor: --";
    calibration.innerText = "Calibración: 0 / 100";
    return;
  }

  const avg = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  services.innerText = "Servicios: " + deviations.length;
  deviation.innerText = "Desviación media: " + avg.toFixed(1) + " %";
  best.innerText = "Mejor: " + Math.min(...deviations).toFixed(1) + " %";
  worst.innerText = "Peor: " + Math.max(...deviations).toFixed(1) + " %";
  calibration.innerText = "Calibración: " + deviations.length + " / 100";
}