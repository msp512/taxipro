const API_BASE = "https://taxipro.onrender.com/api";

const TAXI_ID_KEY = "taxipro_taxi_id";
const DEVICE_ID_KEY = "taxipro_device_id";

function normalizeTaxiCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getStoredTaxiCode() {
  return normalizeTaxiCode(
    localStorage.getItem(TAXI_ID_KEY) ||
    localStorage.getItem("taxipro_taxi_code") ||
    "TX001"
  );
}

function generateDeviceId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredDeviceId() {
  let deviceId = String(localStorage.getItem(DEVICE_ID_KEY) || "").trim();

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

function buildPilotHeaders(taxiCode = "") {
  const cleanTaxiCode = normalizeTaxiCode(taxiCode || getStoredTaxiCode());
  const cleanDeviceId = getStoredDeviceId();

  const headers = {
    "Content-Type": "application/json",
    "x-device-id": cleanDeviceId
  };

  if (cleanTaxiCode) {
    headers["x-taxi-code"] = cleanTaxiCode;
  }

  return headers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...buildPilotHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Error de servidor");
  }

  return data;
}

export async function fetchPilotMe() {
  return apiRequest("/pilot/me", { method: "GET" });
}

export async function activateWithInvite(inviteCode, displayName = "") {
  const deviceId = localStorage.getItem("taxipro_device_id");

  if (!inviteCode || !deviceId) {
    throw new Error("Datos incompletos");
  }

  const response = await fetch(`${API_BASE}/pilot/activate-invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId
    },
    body: JSON.stringify({
      invite_code: inviteCode,
      display_name: displayName || deviceId,
      device_id: deviceId
    })
  });

  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "No se pudo activar el dispositivo");
  }

  return data;
}

export async function createInviteAPI(expiresHours = 24) {
  return apiRequest("/pilot/invites", {
    method: "POST",
    body: JSON.stringify({
      expires_hours: expiresHours
    })
  });
}

export async function getPilotDevicesAPI() {
  return apiRequest("/pilot/devices", {
    method: "GET"
  });
}

export async function updatePilotDeviceRoleAPI(deviceId, role) {
  return apiRequest("/pilot/device/role", {
    method: "POST",
    body: JSON.stringify({
      device_id: String(deviceId || "").trim(),
      role: String(role || "").trim().toLowerCase()
    })
  });
}

export async function updatePilotDeviceStatusAPI(deviceId, status) {
  return apiRequest("/pilot/device/status", {
    method: "POST",
    body: JSON.stringify({
      device_id: String(deviceId || "").trim(),
      status: String(status || "").trim().toLowerCase()
    })
  });
}

export async function assignTaxiToDeviceAPI(deviceId, taxiCode) {
  return apiRequest("/pilot/device/assign-taxi", {
    method: "POST",
    body: JSON.stringify({
      device_id: String(deviceId || "").trim(),
      taxi_code: normalizeTaxiCode(taxiCode)
    })
  });
}

export async function calculateFareAPI(
  distance,
  duration,
  city = "Palma",
  supplements = [],
  taxiCode = ""
) {
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

  const cleanTaxiCode = normalizeTaxiCode(taxiCode || getStoredTaxiCode());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${API_BASE}/fare/estimate`, {
      method: "POST",
      headers: buildPilotHeaders(cleanTaxiCode),
      body: JSON.stringify({
        taxi_code: cleanTaxiCode,
        device_id: getStoredDeviceId(),
        distance: numericDistance,
        duration: numericDuration,
        city,
        supplements
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "API error en estimate");
    }

    return data;
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
    taxi_code,
    origin,
    destination,
    destination_initial,
    destination_final,
    distance_km,
    duration_min,
    estimated_price,
    estimated_price_initial,
    estimated_price_final,
    meter_price,
    city,
    route_mode,
    destination_changed,
    destination_changed_at
  } = serviceData || {};

  const numericDistanceKm = distance_km != null ? Number(distance_km) : null;
  const numericDurationMin = duration_min != null ? Number(duration_min) : null;
  const numericEstimatedPrice = Number(estimated_price);
  const numericMeterPrice = Number(meter_price);

  const cleanTaxiCode = normalizeTaxiCode(taxi_code || taxi_id || getStoredTaxiCode());

  if (!cleanTaxiCode) {
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
    taxi_id: cleanTaxiCode,
    taxi_code: cleanTaxiCode,
    device_id: getStoredDeviceId(),
    origin: origin ? String(origin).trim() : "",
    destination: destination ? String(destination).trim() : "",
    destination_initial: destination_initial ? String(destination_initial).trim() : "",
    destination_final: destination_final ? String(destination_final).trim() : "",
    distance_km: numericDistanceKm,
    duration_min: numericDurationMin,
    estimated_price: numericEstimatedPrice,
    estimated_price_initial:
      estimated_price_initial != null ? Number(estimated_price_initial) : null,
    estimated_price_final:
      estimated_price_final != null ? Number(estimated_price_final) : null,
    meter_price: numericMeterPrice,
    city: city ? String(city).trim() : "Palma",
    route_mode: route_mode ? String(route_mode).trim() : "taxipro",
    destination_changed: Boolean(destination_changed),
    destination_changed_at: destination_changed_at || null
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${API_BASE}/services/register-service`, {
      method: "POST",
      headers: buildPilotHeaders(cleanTaxiCode),
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Error registrando servicio");
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al guardar");
    }

    throw error;
  }
}

export async function getServicesAPI(taxiId, limit = 20) {
  const cleanTaxiId = normalizeTaxiCode(taxiId || getStoredTaxiCode());
  const numericLimit = Number(limit);

  if (!cleanTaxiId) {
    throw new Error("Falta taxi_id para consultar servicios");
  }

  const safeLimit =
    Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(Math.trunc(numericLimit), 100)
      : 20;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const params = new URLSearchParams({
      taxi_id: cleanTaxiId,
      device_id: getStoredDeviceId(),
      limit: String(safeLimit)
    });

    const response = await fetch(`${API_BASE}/services?${params.toString()}`, {
      method: "GET",
      headers: buildPilotHeaders(cleanTaxiId),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Error obteniendo servicios");
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al consultar servicios");
    }

    throw error;
  }
}