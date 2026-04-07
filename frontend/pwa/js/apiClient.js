const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocal
  ? "http://localhost:5001/api"
  : "https://taxipro.onrender.com/api";

export async function calculateFareAPI(distance, duration, city = "Palma", supplements = []) {
  const numericDistance = Number(distance);
  const numericDuration = Number(duration);

  if (
    !Number.isFinite(numericDistance) ||
    !Number.isFinite(numericDuration) ||
    numericDistance <= 0 ||
    numericDuration <= 0
  ) {
    throw new Error("Datos inválidos para cálculo");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE}/fare/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distance: numericDistance,
        duration: numericDuration,
        city,
        supplements
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado");
    }

    throw error;
  }
}

export async function registerServiceAPI(serviceData) {
  const {
    taxi_id,
    origin,
    destination,
    distance_km,
    duration_min,
    estimated_price,
    meter_price,
    city = "Palma"
  } = serviceData || {};

  const numericDistanceKm =
    distance_km != null ? Number(distance_km) : null;

  const numericDurationMin =
    duration_min != null ? Number(duration_min) : null;

  const numericEstimatedPrice = Number(estimated_price);
  const numericMeterPrice = Number(meter_price);

  if (!taxi_id) {
    throw new Error("Falta taxi_id");
  }

  if (
    !Number.isFinite(numericEstimatedPrice) ||
    !Number.isFinite(numericMeterPrice) ||
    numericEstimatedPrice <= 0 ||
    numericMeterPrice <= 0
  ) {
    throw new Error("Importes inválidos para registrar el servicio");
  }

  if (
    numericDistanceKm != null &&
    (!Number.isFinite(numericDistanceKm) || numericDistanceKm < 0)
  ) {
    throw new Error("distance_km inválido");
  }

  if (
    numericDurationMin != null &&
    (!Number.isFinite(numericDurationMin) || numericDurationMin < 0)
  ) {
    throw new Error("duration_min inválido");
  }

  const payload = {
    taxi_id: String(taxi_id).trim().toUpperCase(),
    origin: origin ? String(origin).trim() : "",
    destination: destination ? String(destination).trim() : "",
    distance_km: numericDistanceKm,
    duration_min: numericDurationMin,
    estimated_price: numericEstimatedPrice,
    meter_price: numericMeterPrice,
    city
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE}/services/register-service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error registrando servicio: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al guardar");
    }

    throw error;
  }
}

export async function getServicesAPI(taxiId, limit = 20) {
  const cleanTaxiId = taxiId ? String(taxiId).trim().toUpperCase() : "";
  const numericLimit = Number(limit);

  if (!cleanTaxiId) {
    throw new Error("Falta taxi_id para consultar servicios");
  }

  const safeLimit =
    Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(Math.trunc(numericLimit), 100)
      : 20;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams({
      taxi_id: cleanTaxiId,
      limit: String(safeLimit)
    });

    const response = await fetch(`${API_BASE}/services?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error obteniendo servicios: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al consultar servicios");
    }

    throw error;
  }
}