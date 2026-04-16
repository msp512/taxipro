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

  if (estimated) {
    estimated.innerText = data.price.toFixed(2) + " €";
  }

  if (range) {
    range.innerText = `${data.interval.min.toFixed(2)} – ${data.interval.max.toFixed(2)} €`;
  }

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
    } else {
      confidence.innerText = "Tarifa oficial aplicada sobre ruta estimada";
    }
  }

  if (trafficStatus) {
    trafficStatus.innerText = isFixed
      ? "Precio concertado"
      : "Estimación calculada con distancia, tiempo y tráfico actual";
  }

  if (result) {
  result.classList.remove("hidden");
  result.classList.remove("show-result");
  void result.offsetWidth;
  result.classList.add("show-result");
}

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

    const deviationPercent = Number.isFinite(Number(service.deviation))
      ? Number(service.deviation) * 100
      : ((real - estimated) / estimated) * 100;

    const deviationEuro = real - estimated;
    const absDeviation = Math.abs(deviationPercent);

    const item = document.createElement("div");
    item.className = "history-item";

    let deviationClass = "history-deviation-neutral";
    if (deviationPercent > 2) deviationClass = "history-deviation-positive";
    if (deviationPercent < -2) deviationClass = "history-deviation-negative";

    const destination = service.destination || "Destino no disponible";

    item.innerHTML = `
      <div style="font-size:0.82rem;color:#9ca3af;margin-bottom:6px">${destination}</div>
      <div>Estimado: ${estimated.toFixed(2)} €</div>
      <div>Real: ${real.toFixed(2)} €</div>
      <div>Desviación: ${deviationEuro >= 0 ? "+" : ""}${deviationEuro.toFixed(2)} €</div>
      <div class="${deviationClass}">
        Desviación: ${deviationPercent >= 0 ? "+" : ""}${deviationPercent.toFixed(1)} %
      </div>
      <div style="font-size:0.78rem;color:#94a3b8;margin-top:4px">
        Ajuste: ${absDeviation.toFixed(1)} %
      </div>
    `;

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
    services.innerText = "Servicios validados: 0";
    deviation.innerText = "Desviación media: --";
    best.innerText = "Mejor ajuste: --";
    worst.innerText = "Peor ajuste: --";
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
    services.innerText = "Servicios validados: 0";
    deviation.innerText = "Desviación media: --";
    best.innerText = "Mejor ajuste: --";
    worst.innerText = "Peor ajuste: --";
    calibration.innerText = "Calibración: 0 / 100";
    return;
  }

  const avg = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  const bestValue = deviations.reduce((prev, curr) =>
    Math.abs(curr) < Math.abs(prev) ? curr : prev
  );

  const worstValue = deviations.reduce((prev, curr) =>
    Math.abs(curr) > Math.abs(prev) ? curr : prev
  );

  services.innerText = "Servicios validados: " + deviations.length;
  deviation.innerText = "Desviación media: " + avg.toFixed(1) + " %";
  best.innerText = "Mejor ajuste: " + (bestValue >= 0 ? "+" : "") + bestValue.toFixed(1) + " %";
  worst.innerText = "Peor ajuste: " + (worstValue >= 0 ? "+" : "") + worstValue.toFixed(1) + " %";
  calibration.innerText = "Calibración: " + deviations.length + " / 100";
}