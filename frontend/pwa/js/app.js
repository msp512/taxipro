import { initMap, computeRoute } from "./map.js";
import {
  activateWithInvite,
  fetchPilotMe,
  getPilotDevicesAPI,
  updatePilotDeviceRoleAPI,
  updatePilotDeviceStatusAPI,
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

const originInput = document.getElementById("originInput");
const stopInput = document.getElementById("stopInput");
const destinationInput = document.getElementById("destinationInput");
const routeMapSection = document.getElementById("routeMapSection");
const stopsContainer = document.getElementById("stopsContainer");
const addStopBtn = document.getElementById("addStopBtn");
const clearStopBtn = document.getElementById("clearStopBtn");
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
let currentDestinationRoutingValue = null;

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
    if (currentSplash) currentSplash.remove();
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

/* ===============================
   PILOT UI
=============================== */

function updatePilotIdentityUI() {
  const pilotTaxiId = document.getElementById("pilotTaxiId");
  if (!pilotTaxiId) return;

  const role = currentPilotDevice?.role || "sin acceso";
  pilotTaxiId.innerText = `${getTaxiId()} · ${role}`;
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
    pilotAccessBtn.classList.remove("hidden");
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
  refreshServicesFromBackend();
}

async function refreshServicesFromBackend() {
  try {
    const response = await getServicesAPI(getTaxiId(), 100);
    const services = Array.isArray(response?.services) ? response.services : [];
    renderHistory(services);
    updatePilotStats(services);
  } catch (error) {
    console.warn("No se pudieron refrescar servicios desde backend:", error.message);
  }
}

/* ===============================
   ACCESS GATE
=============================== */

function showLoadingState() {
  const gate = document.getElementById("accessGate");
  const app = document.getElementById("mainApp");

  if (app) app.classList.add("hidden");
  if (!gate) return;

  gate.classList.remove("hidden");
  gate.innerHTML = `
    <div class="access-card">
      <h2>Comprobando acceso…</h2>
      <p>Verificando dispositivo y permisos.</p>
    </div>
  `;
}

function renderActivationScreen() {
  const gate = document.getElementById("accessGate");
  const app = document.getElementById("mainApp");

  if (app) app.classList.add("hidden");
  if (!gate) return;

  gate.classList.remove("hidden");
  gate.innerHTML = `
    <div class="access-card">
      <h2>Introduce tu código de acceso</h2>
      <input id="inviteCodeInput" type="text" placeholder="TAXI-XXXX-XXXX" />
      <input id="displayNameInput" type="text" placeholder="Nombre visible (opcional)" />
      <button id="activateInviteBtn" type="button">Activar dispositivo</button>
      <p id="accessGateMessage"></p>
    </div>
  `;

  const btn = document.getElementById("activateInviteBtn");
  const input = document.getElementById("inviteCodeInput");
  const displayNameInput = document.getElementById("displayNameInput");
  const message = document.getElementById("accessGateMessage");

  btn?.addEventListener("click", async () => {
    try {
      btn.disabled = true;
      if (message) message.textContent = "";

      const code = input?.value?.trim()?.toUpperCase() || "";
      const displayName = displayNameInput?.value?.trim() || "";

      await activateWithInvite(code, displayName);

      if (message) {
        message.textContent = "Dispositivo registrado. Pendiente de aprobación.";
      }

      setTimeout(() => {
        initApp();
      }, 1200);
    } catch (error) {
      if (message) {
        message.textContent = error.message || "Código inválido o caducado";
      }
    } finally {
      btn.disabled = false;
    }
  });
}

function renderPendingScreen() {
  const gate = document.getElementById("accessGate");
  const app = document.getElementById("mainApp");

  if (app) app.classList.add("hidden");
  if (!gate) return;

  gate.classList.remove("hidden");
  gate.innerHTML = `
    <div class="access-card">
      <h2>Pendiente de aprobación</h2>
      <p>Tu dispositivo ya está registrado.</p>
      <p>Espera a que un manager o superadmin apruebe el acceso.</p>
      <button id="retryAccessBtn" type="button">Reintentar</button>
    </div>
  `;

  document.getElementById("retryAccessBtn")?.addEventListener("click", () => {
    initApp();
  });
}

function renderDeniedScreen(status) {
  const gate = document.getElementById("accessGate");
  const app = document.getElementById("mainApp");

  if (app) app.classList.add("hidden");
  if (!gate) return;

  const text = status === "blocked" ? "Acceso bloqueado" : "Acceso desactivado";

  gate.classList.remove("hidden");
  gate.innerHTML = `
    <div class="access-card">
      <h2>${text}</h2>
      <p>Este dispositivo no tiene acceso operativo en este momento.</p>
      <button id="retryDeniedBtn" type="button">Reintentar</button>
    </div>
  `;

  document.getElementById("retryDeniedBtn")?.addEventListener("click", () => {
    initApp();
  });
}

function renderMainApp(me) {
  const gate = document.getElementById("accessGate");
  const app = document.getElementById("mainApp");
  const device = me?.device || me || {};

  if (gate) {
    gate.classList.add("hidden");
    gate.innerHTML = "";
    gate.style.display = "none";
  }

  if (app) {
    app.classList.remove("hidden");
    app.style.display = "block";
  }

  document.body.classList.add("pilot-authorized");
  document.body.dataset.role = device.role || "";
  document.body.dataset.status = device.status || "";

  const adminSection = document.getElementById("adminDevicesSection");
  if (adminSection) {
    const canManage = ["manager", "superadmin"].includes(device.role);
    adminSection.classList.toggle("hidden", !canManage);
  }

  console.log("MAIN APP RENDERED", me);
}

async function syncCurrentPilotDevice() {
  const me = await fetchPilotMe();

  currentPilotDevice = me?.device || null;

  if (me?.device?.taxi_code) {
    localStorage.setItem("taxipro_taxi_id", me.device.taxi_code);
  }

  if (me?.device?.device_id) {
    localStorage.setItem("taxipro_device_id", me.device.device_id);
  }

  if (me?.device?.role) {
    localStorage.setItem("taxipro_device_role", me.device.role);
  }

  if (me?.screen === "app") {
    localStorage.setItem("taxipro_device_activated", "true");
  }

  updatePilotIdentityUI();

  return me;
}

/* ===============================
   ADMIN / MANAGER DEVICES
=============================== */

async function fetchPilotDevices() {
  const response = await getPilotDevicesAPI();
  return Array.isArray(response?.devices) ? response.devices : [];
}

async function updateDeviceRole(deviceId, role) {
  return updatePilotDeviceRoleAPI(deviceId, role);
}

async function updateDeviceStatus(deviceId, status) {
  return updatePilotDeviceStatusAPI(deviceId, status);
}

async function approvePendingDevice(deviceId) {
  await updateDeviceRole(deviceId, "operator");
  await updateDeviceStatus(deviceId, "active");
}

function renderDevices(devices) {
  const container = document.getElementById("adminDevicesList");
  if (!container) return;

  const currentId = getDeviceId();

  container.innerHTML = devices.map((d) => {
    const isCurrent = d.device_id === currentId;
    const role = String(d.role || "").toLowerCase();
    const status = String(d.status || "").toLowerCase();
    const isPending = role === "pending";

    const canActivate = !isCurrent && status !== "active";
    const canDeactivate = !isCurrent && status !== "inactive";
    const canBlock = !isCurrent && status !== "blocked";
    const canSetOperator = !isCurrent && role !== "operator";
    const canSetManager = !isCurrent && role !== "manager" && role !== "superadmin";

    return `
      <div class="admin-device-card">
        <div><strong>${d.display_name || "DISPOSITIVO"}</strong>${isCurrent ? " · ACTUAL" : ""}</div>
        <div>${d.device_id}</div>
        <div>ROL: ${String(d.role || "").toUpperCase()}</div>
        <div>ESTADO: ${String(d.status || "").toUpperCase()}</div>
        <div>TAXI: ${d.taxi_code || "—"}</div>

        <div class="admin-device-actions">
          ${!isCurrent && isPending ? `<button type="button" class="device-action-btn success" data-action="approve" data-id="${d.device_id}">APROBAR</button>` : ""}
          ${canActivate ? `<button type="button" class="device-action-btn success" data-action="activate" data-id="${d.device_id}">ACTIVAR</button>` : ""}
          ${canDeactivate ? `<button type="button" class="device-action-btn" data-action="inactive" data-id="${d.device_id}">DESACTIVAR</button>` : ""}
          ${canBlock ? `<button type="button" class="device-action-btn danger" data-action="block" data-id="${d.device_id}">BLOQUEAR</button>` : ""}
          ${canSetOperator ? `<button type="button" class="device-action-btn" data-action="operator" data-id="${d.device_id}">OPERATOR</button>` : ""}
          ${canSetManager ? `<button type="button" class="device-action-btn" data-action="manager" data-id="${d.device_id}">MANAGER</button>` : ""}
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

        if (action === "approve") await approvePendingDevice(id);
        if (action === "activate") await updateDeviceStatus(id, "active");
        if (action === "inactive") await updateDeviceStatus(id, "inactive");
        if (action === "block") await updateDeviceStatus(id, "blocked");
        if (action === "operator") await updateDeviceRole(id, "operator");
        if (action === "manager") await updateDeviceRole(id, "manager");

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

  const canManage = ["manager", "superadmin"].includes(currentPilotDevice?.role);

  if (!canManage) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  const devices = await fetchPilotDevices();
  renderDevices(devices);
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

    if (input === stopInput) {
      // La parada intermedia se guarda por el valor visible del input.
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
  if (stopInput) createMallorcaDestinationAutocomplete(stopInput);
  if (destinationInput) createMallorcaDestinationAutocomplete(destinationInput);
}

function getRouteRequest() {
  const origin = originInput?.value.trim() || "";
  const destination = destinationInput?.value.trim() || "";

  const stops = [];

  if (stopInput?.value.trim()) {
    stops.push(stopInput.value.trim());
  }

  return {
    origin,
    stops,
    destination
  };
}
function clearStops() {
  if (stopInput) {
    stopInput.value = "";
  }
}

function formatClientRoute(route) {
  const parts = [
    route?.origin,
    ...(route?.stops || []),
    route?.destination
  ].filter(Boolean);

  if (!parts.length) return "Trayecto estimado";

  return parts.map((p) => String(p).split(",")[0]).join(" → ");
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

clearStopBtn?.addEventListener("click", () => {
  clearStops();
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
  const routeRequest = getRouteRequest();

  const origin = routeRequest.origin;
  const destination = routeRequest.destination;
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

    const route = await computeRoute(
      origin,
      destinationForRoute,
      routeRequest.stops
    );

    if (!route) {
      clearCurrentEstimate();
      throw new Error("No se pudo calcular la ruta");
    }

    lastRoute = {
      origin,
      stops: routeRequest.stops,
      destination,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes
    };

    let fixedFare = null;

    if (mode !== "taxipro") {
      fixedFare = resolveFixedFare(mode, origin, destination);
    }

    if (fixedFare) {
      lastFare = fixedFare;

      showPriceResult({
        ...fixedFare,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes
      });
    } else {
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

      if (mode !== "taxipro") {
        alert("No había tarifa fija exacta. Se ha mostrado estimación TaxiPro.");
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
    origin: lastRoute.origin,
    destination: lastRoute.destination,
    stops: lastRoute.stops || []
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
      origin: lastRoute.origin || originInput?.value.trim() || "Origen manual",
      destination: lastRoute.destination || destinationInput?.value.trim(),
      destination_initial: lastRoute.destination || destinationInput?.value.trim(),
      destination_final: lastRoute.destination || destinationInput?.value.trim(),
      stops_json: lastRoute.stops || [],
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

  const clientRoute = document.getElementById("clientRoute");
  const clientPrice = document.getElementById("clientPrice");
  const clientDistance = document.getElementById("clientDistance");
  const clientDuration = document.getElementById("clientDuration");

  if (clientRoute) {
    clientRoute.textContent = formatClientRoute(lastRoute);
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
      lastRoute.distanceKm > 0
        ? `${lastRoute.distanceKm.toFixed(1)} km`
        : "Tarifa fija";
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

function setupHistoryDetails() {
  const historyPanel = document.getElementById("historyPanel");
  const historyDetails = document.getElementById("historyDetails");
  const historySummary = document.getElementById("historySummary");

  if (!historyDetails || !historySummary) return;

  if (historyPanel) {
    historyPanel.classList.remove("hidden");
  }

  historyDetails.removeAttribute("open");

  historyDetails.addEventListener("toggle", () => {
    historySummary.textContent = historyDetails.open
      ? "Ocultar historial"
      : "Últimos servicios";
  });
}

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

async function initTaxiProCore() {
  updatePilotIdentityUI();

  setupPilotAccessControls();

  if (originInput) {
    originInput.value = "";
  }

  if (startTripBtn) startTripBtn.disabled = true;
  if (saveMeterBtn) saveMeterBtn.disabled = true;

  if (typeof updateRouteBlockStates === "function") {
    updateRouteBlockStates();
  }

  if (typeof updateSupplementsSummary === "function") {
    updateSupplementsSummary();
  }

  if (typeof hideCalculatedMap === "function") {
    hideCalculatedMap();
  } else {
    document.getElementById("routeMapSection")?.classList.add("hidden");
  }

  await waitForGoogleMaps();
  initMap();
  initAutocomplete();

  refreshServicesFromBackend().catch((error) => {
    console.warn("Historial no disponible al iniciar:", error.message);
  });

  initAdminPanel().catch((error) => {
    console.warn("Panel admin no disponible al iniciar:", error.message);
  });
}

function renderConnectionRetryScreen(message = "No se pudo conectar con el servidor.") {
  const gate = document.getElementById("accessGate");
  const app = document.getElementById("mainApp");

  if (app) {
    app.classList.add("hidden");
    app.style.display = "none";
  }

  if (!gate) return;

  gate.classList.remove("hidden");
  gate.style.display = "flex";
  gate.innerHTML = `
    <div class="access-card">
      <h2>Conectando con TAXIPRO</h2>
      <p>${message}</p>
      <p>Si el servidor estaba en reposo, puede tardar unos segundos en despertar.</p>
      <button id="retryConnectionBtn" type="button">Reintentar conexión</button>
    </div>
  `;

  document.getElementById("retryConnectionBtn")?.addEventListener("click", () => {
    initApp();
  });
}

function isDeviceNotRegisteredError(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("dispositivo no registrado") ||
    message.includes("device not registered") ||
    message.includes("not registered") ||
    message.includes("404")
  );
}

function isTimeoutOrNetworkError(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("tiempo de espera") ||
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("abort")
  );
}

async function initApp() {
  try {
    getDeviceId();
    getDeviceName();

    showLoadingState();

    let me;

    try {
      me = await syncCurrentPilotDevice();
    } catch (pilotError) {
      console.warn("Piloto no disponible al iniciar:", pilotError.message);

      forceHideSplash();

      if (isDeviceNotRegisteredError(pilotError)) {
        renderActivationScreen();
        return;
      }

      if (isTimeoutOrNetworkError(pilotError)) {
        renderConnectionRetryScreen("Tiempo de espera agotado al comprobar el acceso.");
        return;
      }

      renderConnectionRetryScreen(pilotError.message || "No se pudo verificar el acceso.");
      return;
    }

    console.log("PILOT ME INIT:", me);

    if (!me?.ok || me?.screen === "activation") {
      renderActivationScreen();
      forceHideSplash();
      return;
    }

    if (me.screen === "pending") {
      renderPendingScreen();
      forceHideSplash();
      return;
    }

    if (me.screen === "denied") {
      renderDeniedScreen(me.status);
      forceHideSplash();
      return;
    }

    const device = me?.device || null;
    const isActiveDevice =
      me?.screen === "app" ||
      String(device?.status || "").toLowerCase() === "active";

    if (!isActiveDevice) {
      renderDeniedScreen(device?.status || "inactive");
      forceHideSplash();
      return;
    }

    currentPilotDevice = device;

    renderMainApp(me);
    hideSplashWhenReady();

    try {
      await initTaxiProCore();
    } catch (coreError) {
      console.error("Error inicializando núcleo TaxiPro:", coreError);
      renderConnectionRetryScreen("Acceso autorizado, pero no se pudo inicializar TAXIPRO.");
      return;
    }

    setupHistoryDetails();
    renderMainApp(me);
  } catch (error) {
    console.error("Error inicializando la app:", error);
    forceHideSplash();
    renderConnectionRetryScreen(error.message || "No se pudo inicializar la app.");
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
  initApp();

  setTimeout(() => {
    const splash = document.getElementById("splash");
    const gate = document.getElementById("accessGate");
    const app = document.getElementById("mainApp");

    const gateVisible = gate && !gate.classList.contains("hidden");
    const appVisible = app && !app.classList.contains("hidden");

    if (splash && (gateVisible || appVisible)) {
      forceHideSplash();
    }
  }, 5000);
});

window.addEventListener("scroll", () => {
  const header = document.querySelector(".taxipro-header");
  if (!header) return;

  if (window.scrollY > 40) {
    header.classList.add("compact");
  } else {
    header.classList.remove("compact");
  }
});

window.fetchPilotMe = fetchPilotMe;

/* ==============================
   SERVICE WORKER REGISTRO
============================== */

// Desactivado temporalmente para depuración