import { initMap, computeRoute } from "./map.js";
import {
  activatePilotDeviceAPI,
  calculateFareAPI,
  registerServiceAPI,
  getServicesAPI
} from "./apiClient.js";
import {
  findFixedAgencyTariff,
  findFixedHotelTariff,
  findFixedStipulatedTariff,
  findTransferMatrixPrice,
  getQuickDestinationByMode
} from "./fixedTariffs.js";
import { showPriceResult, updatePilotStats, renderHistory } from "./ui.js";
import {
  saveService,
  confirmLastService
} from "./serviceStorage.js";

const TAXI_ID_KEY = "taxipro_taxi_id";
const DEVICE_ID_KEY = "taxipro_device_id";
const DEVICE_NAME_KEY = "taxipro_device_name";
const DEVICE_ACTIVATED_KEY = "taxipro_device_activated";
const PILOT_ALLOWED_IDS = [
  "TX001",
  "TX002",
  "TX003",
  "TXT0001",
  "TXT0002",
  "TXT0003"
];

const originInput = document.getElementById("originInput");
const destinationInput = document.getElementById("destinationInput");
const pricingMode = document.getElementById("pricingMode");
const calculateBtn = document.getElementById("calculateBtn");
const startTripBtn = document.getElementById("startTripBtn");
const saveMeterBtn = document.getElementById("saveMeterBtn");
const meterPriceInput = document.getElementById("meterPriceInput");
const loadingBar = document.getElementById("loadingBar");
const showClientBtn = document.getElementById("showClientMode");
const closeClientBtn = document.getElementById("closeClientMode");
const clientMode = document.getElementById("clientMode");
const logo = document.getElementById("logo");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const taxiIdInput = document.getElementById("taxiIdInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const meterReminder = document.getElementById("meterReminder");
const reminderActionBtn = document.getElementById("reminderActionBtn");
const clientBadge = document.getElementById("clientBadge");
const clientPriceLabel = document.getElementById("clientPriceLabel");

const useLocationBtn =
  document.getElementById("useLocationBtn") ||
  document.getElementById("originLocationBtn") ||
  document.getElementById("detectLocationBtn") ||
  document.querySelector("[data-action='use-location']");

let lastRoute = null;
let lastFare = null;
let reminderTimer = null;
let isSavingService = false;
let exitArmed = false;
let currentPilotDevice = null;

/* ===============================
   DEVICE / TAXI ID
=============================== */

function normalizeTaxiId(value) {
  return String(value || "").trim().toUpperCase();
}

function getTaxiId() {
  return normalizeTaxiId(localStorage.getItem(TAXI_ID_KEY) || "TX001");
}

function generateDeviceId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

function getDeviceName() {
  let deviceName = localStorage.getItem(DEVICE_NAME_KEY);

  if (!deviceName) {
    deviceName = `${navigator.platform || "device"} | ${navigator.userAgent.slice(0, 60)}`;
    localStorage.setItem(DEVICE_NAME_KEY, deviceName);
  }

  return deviceName;
}

function markDeviceActivated() {
  localStorage.setItem(DEVICE_ACTIVATED_KEY, "true");
}

function clearDeviceActivatedFlag() {
  localStorage.removeItem(DEVICE_ACTIVATED_KEY);
}

function isDeviceActivated() {
  return localStorage.getItem(DEVICE_ACTIVATED_KEY) === "true";
}

async function ensureDeviceActivation() {
  const taxiCode = getTaxiId();
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  if (!taxiCode) {
    throw new Error("No hay taxi_code configurado");
  }

  if (isDeviceActivated()) {
    return;
  }

  const activationKey = window.prompt("Introduce la clave de activación TAXIPRO");

  if (!activationKey) {
    throw new Error("Acceso bloqueado");
  }

  await activatePilotDeviceAPI({
    taxi_code: taxiCode,
    device_id: deviceId,
    device_name: deviceName,
    activation_key: activationKey
  });

  markDeviceActivated();
}

function isPilotAuthorized(taxiId) {
  return PILOT_ALLOWED_IDS.includes(normalizeTaxiId(taxiId));
}

async function fetchCurrentPilotDevice() {
  const response = await fetch("https://taxipro.onrender.com/api/pilot/me", {
    headers: {
      "x-taxi-code": getTaxiId(),
      "x-device-id": getDeviceId()
    }
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const rawText = await response.text();
    throw new Error(`Respuesta no JSON en /api/pilot/me (${response.status})`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo obtener el dispositivo actual");
  }

  return data.device || null;
}
async function syncCurrentPilotDevice() {
  currentPilotDevice = await fetchCurrentPilotDevice();

  if (currentPilotDevice?.status === "active") {
    markDeviceActivated();
  } else {
    clearDeviceActivatedFlag();
  }

  updatePilotIdentityUI();
}

/* ===============================
   CONTROL SALIDA APP CON DOBLE ATRÁS
=============================== */

function showBackExitToast() {
  const existing = document.getElementById("exit-back-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "exit-back-toast";
  toast.textContent = "Pulsa atrás otra vez para salir";
  toast.style.position = "fixed";
  toast.style.left = "50%";
  toast.style.bottom = "24px";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "rgba(15, 22, 34, 0.92)";
  toast.style.color = "#fff";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "14px";
  toast.style.fontSize = "0.92rem";
  toast.style.zIndex = "10000";
  toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.28)";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 1600);
}

function enableAppExitGuard() {
  history.pushState({ taxipro: "root" }, "", location.href);

  window.addEventListener("popstate", () => {
    if (clientMode && !clientMode.classList.contains("hidden")) {
      clientMode.classList.add("hidden");
      history.pushState({ taxipro: "root" }, "", location.href);
      return;
    }

    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      settingsModal.classList.add("hidden");
      history.pushState({ taxipro: "root" }, "", location.href);
      return;
    }

    if (!exitArmed) {
      exitArmed = true;
      showBackExitToast();
      history.pushState({ taxipro: "root" }, "", location.href);

      setTimeout(() => {
        exitArmed = false;
      }, 1800);

      return;
    }

    exitArmed = false;
    window.history.back();
  });
}

/* ===============================
   SPLASH
=============================== */

const SPLASH_MIN_MS = 320;
const splashStart = Date.now();
let splashRemoved = false;


/* ===============================
   QUICK LOCATIONS
=============================== */

const QUICK_LOCATIONS = {
  playa: "Playa de Palma, Mallorca",
  centro: "Plaça de la Reina, Palma, Mallorca",
  aeropuerto: "Aeropuerto de Palma, Mallorca",
  puerto: "Puerto de Palma, Estación Marítima, Mallorca"
};

const QUICK_DESTINATION_CONFIG = {
  airport: {
    displayValue: "Aeropuerto de Palma, Mallorca",
    routingValue: "Aeropuerto de Palma Salidas, Mallorca"
  },
  port: {
    displayValue: "Puerto de Palma, Mallorca",
    routingValue: "Puerto de Palma, Estación Marítima, Mallorca"
  },
  hospital: {
    displayValue: "Hospital Son Espases, Palma, Mallorca",
    routingValue: "Hospital Son Espases, Palma, Mallorca"
  },
  center: {
    displayValue: "Plaça de la Reina, Palma, Mallorca",
    routingValue: "Plaça de la Reina, Palma, Mallorca"
  }
};

let currentDestinationRoutingValue = null;

/* ===============================
   PILOT UI
=============================== */

function updatePilotIdentityUI() {
  const pilotTaxiId = document.getElementById("pilotTaxiId");
  if (pilotTaxiId) {
    const role = currentPilotDevice?.role || "operator";
    pilotTaxiId.innerText = `${getTaxiId()} · ${role}`;
  }
}

function syncPilotAccessVisibility() {
  const pilotAccessBtn = document.getElementById("pilotAccessBtn");
  if (!pilotAccessBtn) return;

  const allowed = isPilotAuthorized(getTaxiId());
  pilotAccessBtn.classList.toggle("hidden", !allowed);
  updatePilotIdentityUI();
}

function togglePilotStats(forceState = null) {
  const panel = document.getElementById("pilotStats");
  if (!panel) return;

  const shouldShow =
    typeof forceState === "boolean"
      ? forceState
      : panel.classList.contains("hidden");

  panel.classList.toggle("hidden", !shouldShow);
}

function setupPilotAccessControls() {
  const pilotAccessBtn = document.getElementById("pilotAccessBtn");
  const pilotPanel = document.getElementById("pilotStats");

  let pressTimer = null;
  let longPressTriggered = false;

  if (pilotAccessBtn) {
    pilotAccessBtn.addEventListener("click", () => {
      togglePilotStats();
    });
  }

  if (logo) {
    const startPress = () => {
      longPressTriggered = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        longPressTriggered = true;
        togglePilotStats();
        if (navigator.vibrate) navigator.vibrate(35);
      }, 700);
    };

    const cancelPress = () => {
      clearTimeout(pressTimer);
    };

    logo.addEventListener("mousedown", startPress);
    logo.addEventListener("mouseup", cancelPress);
    logo.addEventListener("mouseleave", cancelPress);
    logo.addEventListener("touchstart", startPress, { passive: true });
    logo.addEventListener("touchend", cancelPress);
    logo.addEventListener("touchcancel", cancelPress);

    logo.addEventListener("click", (e) => {
      if (longPressTriggered) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pilotPanel && !pilotPanel.classList.contains("hidden")) {
      togglePilotStats(false);
    }
  });
}

function saveTaxiIdFromSettings() {
  if (!taxiIdInput) return;

  const normalized = normalizeTaxiId(taxiIdInput.value || "TX001");
  localStorage.setItem(TAXI_ID_KEY, normalized);
  localStorage.removeItem(DEVICE_ACTIVATED_KEY);
  currentPilotDevice = null;

  if (settingsModal) {
    settingsModal.classList.add("hidden");
  }

  if (settingsBtn) {
    settingsBtn.textContent = "✓";
    setTimeout(() => {
      settingsBtn.textContent = "⚙";
    }, 1200);
  }

  updatePilotIdentityUI();
  syncPilotAccessVisibility();
  refreshServicesFromBackend();
}

async function refreshServicesFromBackend() {
  try {
    const response = await getServicesAPI(getTaxiId(), 20);
    const services = Array.isArray(response?.services) ? response.services : [];
    renderHistory(services);
    updatePilotStats(services);
  } catch (error) {
    console.warn("No se pudieron refrescar servicios desde backend:", error.message);
  }
}

function refreshServicesInBackground() {
  refreshServicesFromBackend().catch((error) => {
    console.warn("Historial cargado en segundo plano con error:", error?.message || error);
  });
}

/* ===============================
   AUTOCOMPLETE / MAP HELPERS
=============================== */

function formatShortPlace(name, formattedAddress) {
  const safeName = (name || "").trim();
  const formatted = (formattedAddress || "").trim();

  if (!safeName && !formatted) return "";

  const firstPart = formatted ? formatted.split(",")[0].trim() : "";

  if (/hotel|resort|apartamentos|hostal|palace|inn|suites/i.test(safeName)) {
    if (/palma/i.test(formatted)) return `${safeName}, Palma, Mallorca`;
    if (/mallorca|illes balears/i.test(formatted)) return `${safeName}, Mallorca`;
    return safeName || formatted;
  }

  if (/aeropuerto/i.test(safeName) || /airport/i.test(safeName)) {
    return "Aeropuerto de Palma, Mallorca";
  }

  if (/puerto/i.test(safeName) || /estación marítima/i.test(formatted)) {
    return "Puerto de Palma, Mallorca";
  }

  if (/son espases/i.test(safeName) || /son espases/i.test(formatted)) {
    return "Hospital Son Espases, Palma, Mallorca";
  }

  if (/son ll[àa]tzer/i.test(safeName) || /son ll[àa]tzer/i.test(formatted)) {
    return "Hospital Son Llàtzer, Palma, Mallorca";
  }

  if (/palma/i.test(formatted)) {
    return `${safeName || firstPart}, Palma`;
  }

  if (/mallorca|illes balears/i.test(formatted)) {
    return `${safeName || firstPart}, Mallorca`;
  }

  return safeName || formatted;
}

function getMallorcaBounds() {
  return new google.maps.LatLngBounds(
    new google.maps.LatLng(39.15, 2.30),
    new google.maps.LatLng(40.10, 3.55)
  );
}

function applyPlaceToInput(input, place) {
  if (!place) return;

  const cleanValue = formatShortPlace(
    place.name || "",
    place.formatted_address || ""
  );

  if (cleanValue) {
    input.value = cleanValue;

    if (input === destinationInput) {
      currentDestinationRoutingValue = cleanValue;
    }
  }
}

function createMallorcaOriginAutocomplete(input) {
  const bounds = getMallorcaBounds();

  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "es" },
    bounds,
    strictBounds: true,
    fields: ["geometry", "name", "formatted_address", "address_components"]
  });

  autocomplete.setBounds(bounds);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    applyPlaceToInput(input, place);
  });

  return autocomplete;
}

function createMallorcaDestinationAutocomplete(input) {
  const bounds = getMallorcaBounds();

  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "es" },
    bounds,
    strictBounds: true,
    fields: ["geometry", "name", "formatted_address", "address_components"]
  });

  autocomplete.setBounds(bounds);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    applyPlaceToInput(input, place);
  });

  return autocomplete;
}

function initAutocomplete() {
  if (!window.google?.maps?.places) return;

  if (originInput) createMallorcaOriginAutocomplete(originInput);
  if (destinationInput) createMallorcaDestinationAutocomplete(destinationInput);
}

function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps?.Geocoder) {
      reject(new Error("Geocoder no disponible"));
      return;
    }

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.length) {
        const top = results[0];
        const address = top.formatted_address || "";
        resolve(address);
      } else {
        reject(new Error(status || "GEOCODER_ERROR"));
      }
    });
  });
}

function setUseLocationButtonState(isLoading = false) {
  if (!useLocationBtn) return;
  useLocationBtn.disabled = isLoading;
  useLocationBtn.textContent = isLoading ? "Ubicando…" : "Usar mi ubicación";
}

async function setCurrentOriginFromGPS() {
  if (!navigator.geolocation) {
    alert("Tu navegador no permite geolocalización.");
    return;
  }

  if (!originInput) {
    alert("No se ha encontrado el campo de origen.");
    return;
  }

  setUseLocationButtonState(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        const address = await reverseGeocode(lat, lng);
        originInput.value = address;
      } catch (error) {
        console.error("Error geocodificando origen:", error);
        originInput.value = `Ubicación actual (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        alert("Se obtuvo tu ubicación, pero no se pudo convertir a dirección exacta.");
      } finally {
        setUseLocationButtonState(false);
      }
    },
    (error) => {
      console.error("Error GPS:", error);

      let message = "No se pudo obtener tu ubicación.";

      if (error.code === 1) {
        message = "Permiso de ubicación denegado. Revisa los permisos del navegador.";
      } else if (error.code === 2) {
        message = "Ubicación no disponible en este momento.";
      } else if (error.code === 3) {
        message = "Tiempo agotado al intentar obtener tu ubicación.";
      }

      alert(message);
      setUseLocationButtonState(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

/* ===============================
   ESTIMATION HELPERS
=============================== */

function getSelectedSupplements() {
  const selected = [];
  document.querySelectorAll(".supplement-btn.active").forEach((btn) => {
    const key = btn.dataset.supplement;
    if (key) selected.push(key);
  });
  return selected;
}

function clearCurrentEstimate() {
  lastRoute = null;
  lastFare = null;

  if (startTripBtn) {
    startTripBtn.disabled = true;
    startTripBtn.textContent = "Iniciar trayecto";
  }

  if (saveMeterBtn) {
    saveMeterBtn.disabled = true;
    saveMeterBtn.textContent = "Registrar servicio";
  }

  if (meterPriceInput) {
    meterPriceInput.value = "";
  }

  hideMeterReminder();

  const estimated = document.getElementById("estimatedPrice");
  const range = document.getElementById("priceRange");
  const distance = document.getElementById("distanceValue");
  const duration = document.getElementById("durationValue");
  const confidence = document.querySelector(".confidence-indicator");
  const estimationTitle = document.getElementById("estimationTitle");
  const trafficStatus = document.querySelector(".traffic-status");

  if (estimationTitle) estimationTitle.textContent = "Estimación TaxiPro";
  if (estimated) estimated.textContent = "0.00 €";
  if (range) range.textContent = "0.00 – 0.00 €";
  if (distance) distance.textContent = "-- km";
  if (duration) duration.textContent = "-- min";
  if (confidence) confidence.textContent = "Tarifa oficial aplicada sobre ruta estimada";
  if (trafficStatus) {
    trafficStatus.textContent = "Estimación calculada con distancia, tiempo y tráfico actual";
  }
}

function showMeterReminder() {
  if (!meterReminder) return;

  meterReminder.classList.remove("hidden");
  meterReminder.classList.add("reminder-visible");

  clearInterval(reminderTimer);
  reminderTimer = setInterval(() => {
    meterReminder.classList.remove("reminder-visible");
    void meterReminder.offsetWidth;
    meterReminder.classList.add("reminder-visible");
  }, 3 * 60 * 1000);
}

function hideMeterReminder() {
  if (!meterReminder) return;
  meterReminder.classList.add("hidden");
  meterReminder.classList.remove("reminder-visible");
  clearInterval(reminderTimer);
}

function buildFixedFareResult(match, fallbackLabel) {
  if (!match || !Number.isFinite(Number(match.precio))) return null;

  const price = Number(match.precio);
  const modeLabel = match.tarifa || fallbackLabel || "Tarifa fija";

  return {
    price,
    interval: { min: price, max: price },
    confidence: 100,
    isFixedTariff: true,
    modeLabel
  };
}

function resolveFixedFare(mode, origin, destination) {
  if (mode === "agency") {
    return buildFixedFareResult(
      findFixedAgencyTariff(origin, destination),
      "Agencias"
    );
  }

  if (mode === "stipulated") {
    return buildFixedFareResult(
      findFixedStipulatedTariff(origin, destination),
      "Estipulados"
    );
  }

  if (mode === "transfer") {
    const hotelTariff = findFixedHotelTariff(origin, destination);
    if (hotelTariff) return buildFixedFareResult(hotelTariff, "Traslados Hotel");

    const matrixTariff = findTransferMatrixPrice(origin, destination);
    if (matrixTariff) return buildFixedFareResult(matrixTariff, "Matriz Traslados");

    return null;
  }

  return null;
}

/* ===============================
   UI EVENTS
=============================== */

settingsBtn?.addEventListener("click", () => {
  if (taxiIdInput) taxiIdInput.value = getTaxiId();
  settingsModal?.classList.remove("hidden");
  taxiIdInput?.focus();
});

saveSettingsBtn?.addEventListener("click", saveTaxiIdFromSettings);

closeSettingsBtn?.addEventListener("click", () => {
  settingsModal?.classList.add("hidden");
});

settingsModal?.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    settingsModal.classList.add("hidden");
  }
});

reminderActionBtn?.addEventListener("click", () => {
  const section = document.getElementById("meterInputSection");
  section?.scrollIntoView({ behavior: "smooth", block: "center" });
  meterPriceInput?.focus();
});

useLocationBtn?.addEventListener("click", setCurrentOriginFromGPS);

document.querySelectorAll("#quickOrigins button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.quickOrigin;
    if (originInput) {
      originInput.value = QUICK_LOCATIONS[key] || btn.dataset.origin || "";
    }
  });
});

document.querySelectorAll("#quickDestinations button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const keyMap = {
      "✈ Aeropuerto": "airport",
      "🚢 Puerto": "port",
      "🏥 Son Espases": "hospital",
      "🏛 Centro": "center"
    };

    const key =
      btn.dataset.quickKey ||
      keyMap[btn.textContent.trim()] ||
      (btn.textContent.includes("Aeropuerto") ? "airport" : "") ||
      (btn.textContent.includes("Puerto") ? "port" : "") ||
      (btn.textContent.includes("Son Espases") ? "hospital" : "") ||
      (btn.textContent.includes("Centro") ? "center" : "");

    const mode = pricingMode?.value || "taxipro";
    const tariffValue = getQuickDestinationByMode(key, mode);
    const config = QUICK_DESTINATION_CONFIG[key];

    if (destinationInput) {
      if (mode === "taxipro" && config) {
        destinationInput.value = config.displayValue;
        currentDestinationRoutingValue = config.routingValue;
      } else {
        destinationInput.value = tariffValue || btn.dataset.destination || "";
        currentDestinationRoutingValue = destinationInput.value;
      }
    }
  });
});

document.querySelectorAll(".supplement-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
  });
});

destinationInput?.addEventListener("input", () => {
  currentDestinationRoutingValue = destinationInput.value.trim();
});

pricingMode?.addEventListener("change", () => {
  clearCurrentEstimate();
});

calculateBtn?.addEventListener("click", async () => {
  const origin = originInput?.value.trim();
  const destination = destinationInput?.value.trim();
  const destinationForRoute = currentDestinationRoutingValue || destination;
  const mode = pricingMode?.value || "taxipro";

  if (!destination) {
    alert("Selecciona destino");
    clearCurrentEstimate();
    return;
  }

  if (destination.length < 2) {
    alert("Introduce un destino más completo.");
    clearCurrentEstimate();
    return;
  }

  try {
    if (loadingBar) loadingBar.style.display = "block";
    calculateBtn.disabled = true;
    calculateBtn.textContent = "Calculando…";

    if (mode === "taxipro") {
      if (!origin) {
        alert("Selecciona origen o usa ubicación actual");
        clearCurrentEstimate();
        return;
      }

      if (origin.length < 6) {
        alert("Introduce un origen más completo.");
        clearCurrentEstimate();
        return;
      }

      const route = await computeRoute(origin, destinationForRoute);

      if (!route) {
        clearCurrentEstimate();
        throw new Error("No se pudo calcular la ruta");
      }

      lastRoute = route;

      const supplements = getSelectedSupplements();
      const fare = await calculateFareAPI(
        route.distanceKm,
        route.durationMinutes,
        "Palma",
        supplements,
        getTaxiId()
      );

      lastFare = fare;

      showPriceResult({
        ...fare,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes
      });
    } else {
      if (!origin) {
        alert("En tarifas fijas debes indicar origen.");
        clearCurrentEstimate();
        return;
      }

      let fixedFare = resolveFixedFare(mode, origin, destination);

      if (!fixedFare) {
        const route = await computeRoute(origin, destinationForRoute);

        if (!route) {
          clearCurrentEstimate();
          throw new Error("No existe tarifa fija y tampoco se pudo calcular la ruta");
        }

        lastRoute = route;

        const supplements = getSelectedSupplements();
        const fare = await calculateFareAPI(
          route.distanceKm,
          route.durationMinutes,
          "Palma",
          supplements,
          getTaxiId()
        );

        lastFare = {
          ...fare,
          modeLabel: "Estimación TaxiPro"
        };

        showPriceResult({
          ...fare,
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes
        });

        alert("No había tarifa fija exacta. Se ha mostrado estimación TaxiPro.");
      } else {
        lastRoute = {
          distanceKm: 0,
          durationMinutes: 0
        };

        lastFare = fixedFare;

        showPriceResult({
          ...fixedFare,
          distanceKm: 0,
          durationMinutes: 0
        });
      }
    }

    if (startTripBtn) {
      startTripBtn.disabled = false;
      startTripBtn.textContent = "Iniciar trayecto";
    }

    if (saveMeterBtn) {
      saveMeterBtn.disabled = true;
      saveMeterBtn.textContent = "Registrar servicio";
    }

    if (meterPriceInput) {
      meterPriceInput.value = "";
    }
  } catch (err) {
    console.error("Error TaxiPro:", err);
    clearCurrentEstimate();
    alert(err.message || "Error en el cálculo");
  } finally {
    if (loadingBar) loadingBar.style.display = "none";
    calculateBtn.disabled = false;
    calculateBtn.textContent = "Calcular estimación";
  }
});

startTripBtn?.addEventListener("click", () => {
  if (!lastRoute || !lastFare) {
    alert("Primero calcula una estimación");
    return;
  }

  saveService({
    distance_km: lastRoute.distanceKm,
    duration_min: lastRoute.durationMinutes,
    estimated_total: lastFare.price,
    origin: originInput?.value.trim(),
    destination: destinationInput?.value.trim()
  });

  startTripBtn.disabled = true;
  startTripBtn.textContent = "En trayecto…";

  if (saveMeterBtn) {
    saveMeterBtn.disabled = false;
    saveMeterBtn.textContent = "Registrar servicio";
  }

  showMeterReminder();
});

saveMeterBtn?.addEventListener("click", async () => {
  if (isSavingService) return;
  isSavingService = true;

  const meterValue = parseFloat(meterPriceInput?.value);
  const mode = pricingMode?.value || "taxipro";

  if (isNaN(meterValue) || meterValue <= 0) {
    alert("Introduce un precio válido del taxímetro");
    meterPriceInput?.focus();
    isSavingService = false;
    return;
  }

  if (!lastRoute || !lastFare) {
    alert("No hay ningún servicio activo para registrar");
    isSavingService = false;
    return;
  }

  confirmLastService(meterValue);
  hideMeterReminder();

  saveMeterBtn.disabled = true;
  saveMeterBtn.textContent = "Guardando…";

  try {
    await registerServiceAPI({
      taxi_id: getTaxiId(),
      taxi_code: getTaxiId(),
      origin: originInput?.value.trim() || "Origen manual",
      destination: destinationInput?.value.trim(),
      destination_initial: destinationInput?.value.trim(),
      destination_final: destinationInput?.value.trim(),
      distance_km: lastRoute.distanceKm,
      duration_min: lastRoute.durationMinutes,
      estimated_price: lastFare.price,
      estimated_price_initial: lastFare.price,
      estimated_price_final: lastFare.price,
      meter_price: meterValue,
      city: mode === "taxipro" ? "Palma" : `Palma - ${mode}`,
      route_mode: mode,
      destination_changed: false,
      destination_changed_at: null
    });

    saveMeterBtn.textContent = "✓ Servicio guardado";

    if (meterPriceInput) {
      meterPriceInput.value = "";
    }

    try {
      await refreshServicesFromBackend();
    } catch (e) {
      console.warn("Historial no disponible temporalmente");
    }
  } catch (err) {
    console.error("Error guardando en DB:", err);
    alert(`Error al registrar servicio: ${err.message || "error desconocido"}`);
    saveMeterBtn.textContent = "Guardado solo localmente";
    saveMeterBtn.disabled = false;
  } finally {
    setTimeout(() => {
      if (startTripBtn) {
        startTripBtn.disabled = false;
        startTripBtn.textContent = "Iniciar trayecto";
      }

      if (saveMeterBtn) {
        saveMeterBtn.textContent = "Registrar servicio";
      }

      isSavingService = false;
    }, 2000);
  }
});

showClientBtn?.addEventListener("click", () => {
  if (!lastFare || !lastRoute) {
    alert("Primero calcula una estimación");
    return;
  }

  const origin = originInput?.value.trim();
  const destination = destinationInput?.value.trim();

  const clientRoute = document.getElementById("clientRoute");
  const clientPrice = document.getElementById("clientPrice");
  const clientDistance = document.getElementById("clientDistance");
  const clientDuration = document.getElementById("clientDuration");

  if (clientRoute) {
    clientRoute.textContent = origin && destination
      ? `${origin.split(",")[0]} → ${destination.split(",")[0]}`
      : "Trayecto estimado";
  }

  if (clientPrice) {
    if (lastFare.interval) {
      clientPrice.textContent =
        `${lastFare.interval.min.toFixed(0)} – ${lastFare.interval.max.toFixed(0)} €`;
    } else {
      clientPrice.textContent = `${lastFare.price.toFixed(0)} €`;
    }
  }

  if (clientDistance) {
    clientDistance.textContent =
      lastRoute.distanceKm > 0 ? `${lastRoute.distanceKm.toFixed(1)} km` : "Tarifa fija";
  }

  if (clientDuration) {
    clientDuration.textContent =
      lastRoute.durationMinutes > 0
        ? `${Math.round(lastRoute.durationMinutes)} min`
        : (lastFare.modeLabel || "Concertado");
  }

  if (clientBadge) {
    clientBadge.textContent = lastFare.isFixedTariff
      ? (lastFare.modeLabel || "Tarifa fija")
      : "Estimación oficial";
  }

  if (clientPriceLabel) {
    clientPriceLabel.textContent = lastFare.isFixedTariff
      ? "precio concertado"
      : "precio estimado";
  }

  clientMode?.classList.remove("hidden");
});

closeClientBtn?.addEventListener("click", () => {
  clientMode?.classList.add("hidden");
});

/* ===============================
   APP INIT
=============================== */

function waitForGoogleMaps() {
  return new Promise((resolve, reject) => {
    let tries = 0;

    const timer = setInterval(() => {
      tries += 1;

      if (window.google?.maps) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (tries > 100) {
        clearInterval(timer);
        reject(new Error("Google Maps no se cargó a tiempo"));
      }
    }, 100);
  });
}

// reutiliza variable global existente

function hideSplashWhenReady() {
  document.body.classList.add("app-ready");

  const splash = document.getElementById("splash");
  if (!splash) return;

  splash.classList.add("hide");
  splash.style.opacity = "0";
  splash.style.visibility = "hidden";
  splash.style.pointerEvents = "none";
  splash.style.display = "none";

  setTimeout(() => {
    const currentSplash = document.getElementById("splash");
    if (currentSplash) {
      currentSplash.remove();
    }
  }, 50);
}
function forceHideSplash() {
  document.body.classList.add("app-ready");

  const splash = document.getElementById("splash");
  if (splash) {
    splash.style.display = "none";
    splash.remove();
  }
}

async function fetchPilotDevices() {
  const response = await fetch("https://taxipro.onrender.com/api/pilot/devices", {
    headers: {
      "x-taxi-code": getTaxiId(),
      "x-device-id": getDeviceId()
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error cargando dispositivos");
  }

  return data.devices || [];
}

async function deactivateDevice(deviceId) {
  const response = await fetch("https://taxipro.onrender.com/api/pilot/device/deactivate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-taxi-code": getTaxiId(),
      "x-device-id": getDeviceId()
    },
    body: JSON.stringify({
      device_id: deviceId
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo desactivar el dispositivo");
  }

  return data;
}
async function activateDevice(deviceId) {
  const response = await fetch("https://taxipro.onrender.com/api/pilot/device/activate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-taxi-code": getTaxiId(),
      "x-device-id": getDeviceId()
    },
    body: JSON.stringify({
      device_id: deviceId
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo activar el dispositivo");
  }

  return data;
}

async function updateDeviceRole(deviceId, role) {
  const response = await fetch("https://taxipro.onrender.com/api/pilot/device/role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-taxi-code": getTaxiId(),
      "x-device-id": getDeviceId()
    },
    body: JSON.stringify({
      device_id: deviceId,
      role
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar el rol del dispositivo");
  }

  return data;
}

async function renameDevice(deviceId, deviceName) {
  const response = await fetch("https://taxipro.onrender.com/api/pilot/device/rename", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-taxi-code": getTaxiId(),
      "x-device-id": getDeviceId()
    },
    body: JSON.stringify({
      device_id: deviceId,
      device_name: deviceName
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo renombrar el dispositivo");
  }

  return data;
}

function renderDevices(devices) {  
  
  const container = document.getElementById("adminDevicesList");
  if (!container) return;

  const currentId = getDeviceId();

  container.innerHTML = devices.map((d) => {
    const isCurrent = d.device_id === currentId;
    const isActive = d.status === "active";
    const isAdmin = d.role === "admin";

    const statusClass = isActive
      ? "admin-device-status-active"
      : "admin-device-status-inactive";

    let actionButtons = "";

    if (!isCurrent && isActive) {
      actionButtons += `
        <button
          type="button"
          class="device-action-btn danger"
          data-action="deactivate"
          data-id="${d.device_id}"
        >
          DESACTIVAR
        </button>
      `;
    }

    if (!isCurrent && !isActive) {
      actionButtons += `
        <button
          type="button"
          class="device-action-btn success"
          data-action="activate"
          data-id="${d.device_id}"
        >
          ACTIVAR
        </button>
      `;
    }

    if (!isCurrent && !isAdmin) {
      actionButtons += `
        <button
          type="button"
          class="device-action-btn"
          data-action="make-admin"
          data-id="${d.device_id}"
        >
          HACER ADMIN
        </button>
      `;
    }

    if (!isCurrent && isAdmin) {
      actionButtons += `
        <button
          type="button"
          class="device-action-btn"
          data-action="make-operator"
          data-id="${d.device_id}"
        >
          QUITAR ADMIN
        </button>
      `;
    }

    actionButtons += `
      <button
        type="button"
        class="device-action-btn"
        data-action="rename"
        data-id="${d.device_id}"
        data-name="${encodeURIComponent(d.device_name || "")}"
      >
        RENOMBRAR
      </button>
    `;

    return `
      <div class="admin-device-card">
        <div><strong>${d.device_name || "DISPOSITIVO"}</strong>${isCurrent ? " · ACTUAL" : ""}</div>
        <div>${d.device_id}</div>
        <div>ROL: ${String(d.role || "").toUpperCase()}</div>
        <div class="${statusClass}">ESTADO: ${String(d.status || "").toUpperCase()}</div>
        <div class="admin-device-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("button[data-action][data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (!id || !action) return;

      try {
        btn.disabled = true;

        if (action === "activate") {
          if (!window.confirm("¿Activar dispositivo?")) {
            btn.disabled = false;
            return;
          }
          await activateDevice(id);
        }

        if (action === "deactivate") {
          if (!window.confirm("¿Desactivar dispositivo?")) {
            btn.disabled = false;
            return;
          }
          await deactivateDevice(id);
        }

        if (action === "make-admin") {
          if (!window.confirm("¿Convertir este dispositivo en admin?")) {
            btn.disabled = false;
            return;
          }
          await updateDeviceRole(id, "admin");
        }

        if (action === "make-operator") {
          if (!window.confirm("¿Quitar permisos admin a este dispositivo?")) {
            btn.disabled = false;
            return;
          }
          await updateDeviceRole(id, "operator");
        }

        if (action === "rename") {
          const currentName = decodeURIComponent(btn.dataset.name || "");
          const newName = window.prompt("Nuevo nombre del dispositivo:", currentName);

          if (!newName || !newName.trim()) {
            btn.disabled = false;
            return;
          }

          await renameDevice(id, newName.trim());
        }

        const refreshedDevices = await fetchPilotDevices();
        renderDevices(refreshedDevices);

        await syncCurrentPilotDevice();
      } catch (error) {
        alert(error.message || "No se pudo actualizar el dispositivo");
        btn.disabled = false;
      }
    });
  });
}

async function initAdminPanel() {
  const section = document.getElementById("adminDevicesSection");
  if (!section) return;

  if (!currentPilotDevice || currentPilotDevice.role !== "admin") {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  const devices = await fetchPilotDevices();
  renderDevices(devices);
}

async function initializeApp() {
  try {
    console.log("INIT 1");
    getDeviceId();
    getDeviceName();

    updatePilotIdentityUI();
    syncPilotAccessVisibility();
    setupPilotAccessControls();

    if (originInput) {
      originInput.value = "";
    }

    if (startTripBtn) startTripBtn.disabled = true;
    if (saveMeterBtn) saveMeterBtn.disabled = true;

    console.log("INIT 3 - antes activacion");
    await ensureDeviceActivation();
    console.log("INIT 4 - despues activacion");

    await syncCurrentPilotDevice();
    console.log("INIT 4.1 - dispositivo sincronizado desde backend");

    console.log("INIT 5 - antes Google Maps");
    await waitForGoogleMaps();
    console.log("INIT 6 - despues Google Maps");

    initMap();
    initAutocomplete();
    console.log("INIT 7 - mapa iniciado");

    await refreshServicesFromBackend();
    console.log("INIT 8 - historial cargado");

    await initAdminPanel();
    console.log("INIT 9 - panel admin listo");

    hideSplashWhenReady();

    setTimeout(() => {
      forceHideSplash();
    }, 200);
  } catch (error) {
    console.error("Error inicializando la app:", error);
    forceHideSplash();
    alert(error.message || "No se pudo inicializar la app.");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  enableAppExitGuard();

  document.getElementById("refreshDevicesBtn")?.addEventListener("click", async () => {
    try {
      const devices = await fetchPilotDevices();
      renderDevices(devices);
    } catch (error) {
      alert(error.message || "No se pudieron actualizar los dispositivos");
    }
  });
});

window.addEventListener("load", () => {
  initializeApp();

  setTimeout(() => {
    forceHideSplash();
  }, 2500);
});

let deferredPrompt = null;

/* ==============================
   SERVICE WORKER REGISTRO
============================== */

// Desactivado temporalmente para depuración