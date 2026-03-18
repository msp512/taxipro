import { computeRoute } from "./map.js";
import { calculateFareAPI } from "./apiClient.js";
import { showPriceResult } from "./ui.js";
import { saveService } from "./serviceStorage.js";
import { updatePilotStats } from "./ui.js";
import { getStoredServices } from "./serviceStorage.js";
import { renderHistory } from "./ui.js";

const originInput =
  document.getElementById("originInput");

const destinationInput =
  document.getElementById("destinationInput");

const calculateBtn =
  document.getElementById("calculateBtn");

const loadingBar =
  document.getElementById("loadingBar");

  let activeService = null;

const startTripBtn =
  document.getElementById("startTripBtn");

startTripBtn.addEventListener("click", () => {

  if(!lastRoute || !lastFare){

    alert("Primero calcula una estimación");

    return;

  }

  activeService = {

    distance_km: lastRoute.distanceKm,
    duration_min: lastRoute.durationMinutes,
    estimated_total: lastFare.price

  };

  saveService(activeService);

  updatePilotStats();

  startTripBtn.disabled = true;

  alert("Trayecto iniciado");


});

let lastRoute = null;
let lastFare = null;

/* ===============================
   AUTOCOMPLETE GOOGLE PLACES
=============================== */

function initAutocomplete(){

  const autocomplete =
    new google.maps.places.Autocomplete(
      destinationInput
    );

  autocomplete.setFields([
    "geometry",
    "name"
  ]);

}

window.initAutocomplete = initAutocomplete;


/* ===============================
   DETECTAR ORIGEN AUTOMÁTICO
=============================== */

function detectTaxiLocation(){

  if(!navigator.geolocation){

    console.log("Geolocalización no soportada");
    return;

  }

  navigator.geolocation.getCurrentPosition(

    position => {

      const lat =
        position.coords.latitude;

      const lng =
        position.coords.longitude;

      const geocoder =
        new google.maps.Geocoder();

      const latlng = {
        lat: lat,
        lng: lng
      };

      geocoder.geocode(
        { location: latlng },
        (results, status) => {

          if(status === "OK" && results[0]){

            originInput.value =
              results[0].formatted_address;

          }

        }
      );

    },

    error => {

      console.log(
        "Error GPS:",
        error.message
      );

    }

  );

}


/* ===============================
   CALCULAR TARIFA
=============================== */

calculateBtn.addEventListener("click", async () => {

  const origin = originInput.value;
  const destination = destinationInput.value;

  if (!origin || !destination) {

    alert("Selecciona origen y destino");
    return;

  }

  loadingBar.style.display = "block";

  try {

    /* calcular ruta */

    const route =
      await computeRoute(origin, destination);

    /* calcular tarifa */

    const fare =
      await calculateFareAPI(
        route.distanceKm,
        route.durationMinutes
      );

    lastRoute = route;
    lastFare = fare;

    /* mostrar resultado */

    showPriceResult({
  ...fare,
  distanceKm: route.distanceKm,
  durationMinutes: route.durationMinutes
});

loadingBar.style.display = "none";

    startTripBtn.disabled = false;

      } catch(err) {

  console.error("Error TaxiPro:", err);

  alert(err.message || "Error en el cálculo");

  loadingBar.style.display = "none";
}

  

});




/* ===============================
   INICIALIZACIÓN AL CARGAR
=============================== */

window.addEventListener("load", () => {

  setTimeout(() => {
    const splash = document.getElementById("splash");
    if(splash) splash.style.display = "none";
  }, 1200);

  const services = getStoredServices();
  renderHistory(services);
  updatePilotStats();

  if (window.google) {
    initAutocomplete();
  }

  detectTaxiLocation();

  // SERVICE WORKER AQUÍ
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        console.log("TaxiPro Service Worker activo");
      })
      .catch((err) => {
        console.error("Error registrando Service Worker:", err);
      });
  }

});
