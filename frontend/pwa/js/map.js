let map;
let directionsService;
let directionsRenderer;

const BABALU_POINT = {
  lat: 39.54001187908689,
  lng: 2.7127578235862595
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
   REGLA CAN PASTILLA → COLL D'EN RABASSA
=============================== */

function isCanPastillaArea(text) {
  const t = normalizeText(text);

  return (
    t.includes("can pastilla") ||
    t.includes("playa de palma") ||
    t.includes("platja de palma") ||
    t.includes("hotel las arenas") ||
    t.includes("aeropuerto de palma") ||
    t.includes("aeroport de palma")
  );
}

function isCollDenRabassaArea(text) {
  const t = normalizeText(text);

  return (
    t.includes("coll den rabassa") ||
    t.includes("coll d en rabassa") ||
    t.includes("es coll den rabassa")
  );
}

function shouldForceBabaluAccess(origin, destination) {
  return isCanPastillaArea(origin) && isCollDenRabassaArea(destination);
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
    text.includes("centro") ||
    text.includes("palma")
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

function isPalmaUrbanPoint(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("palma") ||
    text.includes("son espases") ||
    text.includes("son llatzer") ||
    text.includes("aeropuerto de palma") ||
    text.includes("aeroport de palma") ||
    text.includes("can pastilla") ||
    text.includes("playa de palma") ||
    text.includes("platja de palma") ||
    text.includes("coll den rabassa") ||
    text.includes("puerto de palma") ||
    text.includes("port de palma") ||
    text.includes("estacion maritima") ||
    text.includes("uib") ||
    text.includes("universitat de les illes balears") ||
    text.includes("universidad de las illes balears") ||
    text.includes("mallorca fashion outlet") ||
    text.includes("festival park") ||
    text.includes("marratxi")
  );
}

function shouldUseTaxiUrbanRouting(origin, destination, stops = []) {
  const points = [
    origin,
    destination,
    ...(Array.isArray(stops) ? stops : [])
  ].filter(Boolean);

  if (points.length < 2) return false;

  return points.every(isPalmaUrbanPoint);
}

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

  if (shouldForceBabaluAccess(origin, destination)) {
    waypoints.push({
      location: BABALU_POINT,
      stopover: false
    });

    console.log("TaxiPro routing rule aplicada: acceso Babalu forzado");
  }

  if (isCentroPalma(origin) && isSonEspases(destination)) {
    waypoints.push({
      location: "Carrer General Riera, Palma, Mallorca",
      stopover: false
    });

    console.log("TaxiPro routing rule aplicada: Centro → Son Espases por General Riera");
  }

  if (isSonEspases(origin) && isCentroPalma(destination)) {
    waypoints.push({
      location: "Carrer General Riera, Palma, Mallorca",
      stopover: false
    });

    console.log("TaxiPro routing rule aplicada: Son Espases → Centro por General Riera");
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

    const taxiUrbanRouting = shouldUseTaxiUrbanRouting(
      origin,
      destination,
      stops
    );

    const waypoints = buildTaxiWaypoints(
      origin,
      destination,
      stops
    );

    const request = {
      origin,
      destination,
      waypoints,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.DRIVING,

      // Para rutas urbanas de Palma evitamos que Google priorice Vía de Cintura
      // cuando un taxi puede circular por ruta urbana más directa.
      avoidHighways: taxiUrbanRouting,
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