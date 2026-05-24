let map;
let directionsService;
let directionsRenderer;

/*
  Waypoint Ca'n Pastilla → Aeropuerto

  Uso permitido:
  - SOLO servicios con origen en la microzona Ca'n Pastilla entre
    calle Congre y calle Goleta.
  - SOLO cuando el destino final sea Aeropuerto.

  No se aplica a:
  - Playa de Palma genérica → Aeropuerto
  - Iberostar / hoteles Playa de Palma → Hotel Boreal → Aeropuerto
  - Can Pastilla genérico si no se identifica Congre / Goleta / marcador específico
  - Rutas con paradas donde el origen real no sea esa microzona
*/
const CAN_PASTILLA_AIRPORT_POINT = {
  lat: 39.5407056,
  lng: 2.7118119
};

/*
  Dique del Oeste
  Sustituye el antiguo acceso rápido PUERTO en origen y destino.
*/
const DIQUE_OESTE_POINT = {
  lat: 39.5519885,
  lng: 2.6392256
};

/*
  Waypoint Paseo Marítimo / Palma interior
  Se usa para intentar evitar que Google saque Playa de Palma → Puerto/Dique
  por Vía de Cintura cuando al taxi le conviene circular por ciudad/paseo marítimo.
*/
const PASEO_MARITIMO_POINT = {
  location: "Passeig Marítim, Palma, Mallorca",
  stopover: false
};

/* ===============================
   NORMALIZACIÓN
=============================== */

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ===============================
   REGLA MICROZONA CA'N PASTILLA → AEROPUERTO
=============================== */

function isAirportDestination(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("aeropuerto") ||
    text.includes("aeroport") ||
    text.includes("airport") ||
    text.includes("pmi") ||
    text.includes("son sant joan")
  );
}

function isCanPastillaAirportMicroZoneOrigin(value = "") {
  const text = normalizeText(value);

  const hasSpecificMarker =
    text.includes("can pastilla al aeropuerto") ||
    text.includes("can pastilla al aeroport") ||
    text.includes("gpr6+7pm") ||
    text.includes("39.5407056") ||
    text.includes("2.7118119");

  const hasCongre =
    text.includes("congre") ||
    text.includes("carrer del congre") ||
    text.includes("calle congre") ||
    text.includes("carrer congre");

  const hasGoleta =
    text.includes("goleta") ||
    text.includes("carrer de la goleta") ||
    text.includes("calle goleta") ||
    text.includes("carrer goleta");

  return hasSpecificMarker || hasCongre || hasGoleta;
}

function shouldForceCanPastillaAirportWaypoint(origin, destination) {
  return (
    isAirportDestination(destination) &&
    isCanPastillaAirportMicroZoneOrigin(origin)
  );
}

/* ===============================
   REGLAS TAXI URBANO PALMA
=============================== */

function isCentroPalma(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("placa de la reina") ||
    text.includes("plaza de la reina") ||
    text.includes("passeig des born") ||
    text.includes("paseo del borne") ||
    text.includes("jaume iii") ||
    text.includes("centro")
  );
}

function isSonEspases(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("son espases") ||
    text.includes("hospital universitari son espases") ||
    text.includes("hospital son espases")
  );
}

function isPlayaDePalmaOrigin(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("playa de palma") ||
    text.includes("platja de palma") ||
    text.includes("s arenal") ||
    text.includes("arenal") ||
    text.includes("can pastilla") ||
    text.includes("hotel riu") ||
    text.includes("iberostar selection") ||
    text.includes("riu san francisco") ||
    text.includes("riu concordia")
  );
}

function isDiqueOesteOrPuertoDestination(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("dique del oeste") ||
    text.includes("dic de l oest") ||
    text.includes("dic de loest") ||
    text.includes("39.5519885") ||
    text.includes("2.6392256") ||
    text.includes("puerto de palma") ||
    text.includes("port de palma") ||
    text.includes("estacion maritima") ||
    text.includes("estacio maritima") ||
    text.includes("muelle") ||
    text.includes("moll")
  );
}

function shouldForcePaseoMaritimo(origin, destination) {
  return (
    isPlayaDePalmaOrigin(origin) &&
    isDiqueOesteOrPuertoDestination(destination)
  );
}

/*
  Waypoints profesionales concretos.

  Importante:
  - No aplicamos reglas generales por "Can Pastilla".
  - No usamos las paradas para decidir el waypoint de Ca'n Pastilla → Aeropuerto.
  - Solo se fuerzan rutas cuando el criterio operativo está validado.
*/
function buildTaxiWaypoints(origin, destination, stops = []) {
  const waypoints = [];

  const existingStops = Array.isArray(stops) ? stops : [];

  existingStops.forEach((stop) => {
    if (stop) {
      waypoints.push({
        location: stop,
        stopover: true
      });
    }
  });

  if (shouldForceCanPastillaAirportWaypoint(origin, destination)) {
    waypoints.push({
      location: CAN_PASTILLA_AIRPORT_POINT,
      stopover: false
    });

    console.log(
      "TaxiPro routing rule aplicada: microzona Congre/Goleta Ca'n Pastilla → Aeropuerto"
    );
  }

  if (shouldForcePaseoMaritimo(origin, destination)) {
    waypoints.push(PASEO_MARITIMO_POINT);

    console.log(
      "TaxiPro routing rule aplicada: Playa de Palma → Puerto/Dique por Paseo Marítimo"
    );
  }

  if (isCentroPalma(origin) && isSonEspases(destination)) {
    waypoints.push({
      location: "Carrer General Riera, Palma, Mallorca",
      stopover: false
    });

    console.log(
      "TaxiPro routing rule aplicada: Centro → Son Espases por General Riera"
    );
  }

  if (isSonEspases(origin) && isCentroPalma(destination)) {
    waypoints.push({
      location: "Carrer General Riera, Palma, Mallorca",
      stopover: false
    });

    console.log(
      "TaxiPro routing rule aplicada: Son Espases → Centro por General Riera"
    );
  }

  return waypoints;
}

/* ===============================
   MAPA
=============================== */

export function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.6953, lng: 3.0176 },
    zoom: 10,
    disableDefaultUI: true
  });

  directionsService = new google.maps.DirectionsService();

  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: "#0F2A44",
      strokeWeight: 5
    }
  });

  directionsRenderer.setMap(map);

  return map;
}

export function computeRoute(origin, destination, stops = []) {
  return new Promise((resolve, reject) => {
    if (!directionsService || !directionsRenderer) {
      reject(new Error("Mapa no inicializado"));
      return;
    }

    const waypoints = buildTaxiWaypoints(origin, destination, stops);

    const request = {
      origin,
      destination,
      waypoints,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.DRIVING,

      /*
        Criterio general TAXIPRO:
        - Google debe priorizar ruta funcional y rápida.
        - No evitamos autopistas de forma global.
        - Solo forzamos waypoints profesionales concretos.
      */
      avoidHighways: false,
      avoidTolls: false,
      avoidFerries: true,

      drivingOptions: {
        departureTime: new Date(),
        trafficModel: "bestguess"
      }
    };

    directionsService.route(request, (result, status) => {
      if (status !== "OK") {
        reject(new Error(status));
        return;
      }

      directionsRenderer.setDirections(result);

      const route = result.routes[0];

      const totalDistanceMeters = route.legs.reduce(
        (sum, leg) => sum + (leg.distance?.value || 0),
        0
      );

      const totalDurationSeconds = route.legs.reduce(
        (sum, leg) => sum + (leg.duration?.value || 0),
        0
      );

      resolve({
        distanceKm: totalDistanceMeters / 1000,
        durationMinutes: totalDurationSeconds / 60
      });
    });
  });
}
