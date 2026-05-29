let map;
let directionsService;
let directionsRenderer;

/*
  TAXIPRO — Reglas profesionales de ruta

  Principio general:
  - Google Maps calcula la ruta base.
  - TAXIPRO solo fuerza waypoints cuando existe una regla profesional clara.
  - Las reglas se aplican sobre origen + destino.
  - Las paradas intermedias reales del usuario se mantienen como stopover:true.
*/

/* ===============================
   PUNTOS PROFESIONALES
=============================== */

/*
  Ca'n Pastilla → Aeropuerto

  Uso permitido:
  - SOLO servicios con origen en microzona Ca'n Pastilla entre Congre / Goleta.
  - SOLO destino Aeropuerto.
*/
const CAN_PASTILLA_AIRPORT_POINT = {
  lat: 39.5407056,
  lng: 2.7118119
};

/*
  Sometimes / Grua / Son Rigo → Aeropuerto o sentido Palma

  Uso permitido:
  - SOLO servicios con recogida en zona Sometimes comprendida entre
    Carrer de la Grua y Avinguda de Son Rigo.
  - Destino Aeropuerto o sentido Palma.
*/
const SOMETIMES_MOTORWAY_ACCESS_POINT = {
  lat: 39.533147,
  lng: 2.734151
};

/*
  Dique del Oeste
*/
const DIQUE_OESTE_POINT = {
  lat: 39.5519885,
  lng: 2.6392256
};

/*
  Paseo Marítimo / Palma interior
*/
const PASEO_MARITIMO_POINT = {
  location: "Passeig Marítim, Palma, Mallorca",
  stopover: false
};

/* ===============================
   PARADAS OFICIALES PLAYA DE PALMA
=============================== */

const TAXI_STAND_POINTS = {
  canPastilla: {
    lat: 39.536306,
    lng: 2.717361
  },
  pillari: {
    lat: 39.5263030,
    lng: 2.7352832
  },
  sometimes: {
    lat: 39.5220475,
    lng: 2.7402520
  },
  riu: {
    lat: 39.5178809,
    lng: 2.7446482
  },
  america: {
    lat: 39.513167,
    lng: 2.752253
  },
  arenal: {
    lat: 39.505614,
    lng: 2.751726
  }
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

function parseCoordinatePair(value = "") {
  const text = String(value || "").trim();

  const match = text.match(
    /^\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*$/
  );

  if (!match) return null;

  const lat = Number(match[1].replace(",", "."));
  const lng = Number(match[2].replace(",", "."));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function isNearPoint(value = "", point, tolerance = 0.0025) {
  const parsed = parseCoordinatePair(value);

  if (!parsed || !point) return false;

  return (
    Math.abs(parsed.lat - point.lat) <= tolerance &&
    Math.abs(parsed.lng - point.lng) <= tolerance
  );
}

function isNearAnyPoint(value = "", points = [], tolerance = 0.0025) {
  return points.some((point) => isNearPoint(value, point, tolerance));
}

/* ===============================
   DESTINOS
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

function isPalmaDirectionDestination(value = "") {
  const text = normalizeText(value);

  return (
    text.includes("palma") ||
    text.includes("centro") ||
    text.includes("centre") ||
    text.includes("plaza de la reina") ||
    text.includes("placa de la reina") ||
    text.includes("passeig maritim") ||
    text.includes("paseo maritimo") ||
    text.includes("dique del oeste") ||
    text.includes("dic de l oest") ||
    text.includes("dic de loest") ||
    text.includes("puerto de palma") ||
    text.includes("port de palma") ||
    text.includes("estacion maritima") ||
    text.includes("estacio maritima") ||
    text.includes("muelle") ||
    text.includes("moll") ||
    text.includes("son espases")
  );
}

function isDiqueOesteOrPuertoDestination(value = "") {
  const text = normalizeText(value);

  if (isAirportDestination(value)) {
    return false;
  }

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
    text.includes("moll") ||
    isNearPoint(value, DIQUE_OESTE_POINT)
  );
}


/* ===============================
   ORÍGENES — MICROZONAS
=============================== */

function isCanPastillaAirportMicroZoneOrigin(value = "") {
  const text = normalizeText(value);

  const hasSpecificMarker =
    text.includes("can pastilla al aeropuerto") ||
    text.includes("can pastilla al aeroport") ||
    text.includes("gpr6+7pm") ||
    text.includes("39.5407056") ||
    text.includes("2.7118119") ||
    isNearPoint(value, CAN_PASTILLA_AIRPORT_POINT);

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

function isSometimesMicroZoneOrigin(value = "") {
  const text = normalizeText(value);

  const hasGrua =
    text.includes("grua") ||
    text.includes("carrer de la grua") ||
    text.includes("calle grua");

  const hasSonRigo =
    text.includes("son rigo") ||
    text.includes("avinguda de son rigo") ||
    text.includes("avenida de son rigo");

  const hasSometimes =
    text.includes("sometimes") ||
    text.includes("marina plaza") ||
    text.includes("39.5220475") ||
    text.includes("2.7402520") ||
    isNearPoint(value, TAXI_STAND_POINTS.sometimes);

  /*
    Importante:
    No usamos "Les Meravelles / Maravelles" porque es demasiado amplio
    y podría activar esta regla en RIU, América u otras zonas donde no toca.
  */
  return hasGrua || hasSonRigo || hasSometimes;
}

function isPlayaDePalmaOrigin(value = "") {
  const text = normalizeText(value);

  const isKnownTaxiStand = isNearAnyPoint(value, [
    TAXI_STAND_POINTS.canPastilla,
    TAXI_STAND_POINTS.pillari,
    TAXI_STAND_POINTS.sometimes,
    TAXI_STAND_POINTS.riu,
    TAXI_STAND_POINTS.america,
    TAXI_STAND_POINTS.arenal
  ]);

  return (
    isKnownTaxiStand ||
    text.includes("playa de palma") ||
    text.includes("platja de palma") ||
    text.includes("s arenal") ||
    text.includes("arenal") ||
    text.includes("can pastilla") ||
    text.includes("les meravelles") ||
    text.includes("maravelles") ||
    text.includes("hotel riu") ||
    text.includes("iberostar selection") ||
    text.includes("riu san francisco") ||
    text.includes("riu concordia")
  );
}

/* ===============================
   REGLAS CENTRO / SON ESPASES
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

/* ===============================
   DECISIONES DE WAYPOINT
=============================== */

function shouldForceCanPastillaAirportWaypoint(origin, destination) {
  return (
    isAirportDestination(destination) &&
    isCanPastillaAirportMicroZoneOrigin(origin)
  );
}

function shouldForceSometimesMotorwayAccess(origin, destination) {
  return (
    isSometimesMicroZoneOrigin(origin) &&
    (isAirportDestination(destination) || isPalmaDirectionDestination(destination))
  );
}

function isPalmaPaseoMaritimoDestination(value = "") {
  const text = normalizeText(value);
  const point = parseCoordinatePair(value);

  if (isAirportDestination(value)) {
    return false;
  }

  if (isSonEspases(value)) {
    return false;
  }

  if (isDiqueOesteOrPuertoDestination(value)) {
    return true;
  }

  if (point) {
    const { lat, lng } = point;

    const isPalmaMaritimeArea =
      lat >= 39.545 &&
      lat <= 39.575 &&
      lng >= 2.615 &&
      lng <= 2.665;

    if (isPalmaMaritimeArea) {
      return true;
    }
  }

  return (
    text.includes("barca samba") ||
    text.includes("passeig maritim") ||
    text.includes("paseo maritimo") ||
    text.includes("avenida gabriel roca") ||
    text.includes("avinguda gabriel roca") ||
    text.includes("auditorium") ||
    text.includes("auditorio") ||
    text.includes("portopi") ||
    text.includes("porto pi") ||
    text.includes("palma") ||
    text.includes("centro") ||
    text.includes("centre") ||
    text.includes("la lonja") ||
    text.includes("llotja") ||
    text.includes("catedral") ||
    text.includes("parc de la mar") ||
    text.includes("plaza de la reina") ||
    text.includes("placa de la reina") ||
    text.includes("passeig des born") ||
    text.includes("paseo del borne") ||
    text.includes("jaume iii") ||
    text.includes("santa catalina")
  );
}

function shouldForcePaseoMaritimo(origin, destination) {
  /*
    Regla Paseo Maritimo:
    Playa de Palma / Can Pastilla / Arenal hacia Palma centro,
    Puerto, Dique Oeste, Barca Samba o frente maritimo.

    Objetivo:
    Evitar vueltas por Via de Cintura / Ma-20 cuando el criterio profesional
    razonable es entrar por el frente maritimo.
  */

  if (isAirportDestination(destination)) {
    return false;
  }

  if (isSonEspases(destination)) {
    return false;
  }

  return (
    isPlayaDePalmaOrigin(origin) &&
    isPalmaPaseoMaritimoDestination(destination)
  );
}

/*
  Waypoints profesionales concretos.

  Reglas:
  - No se aplica una regla general por "Can Pastilla".
  - No se aplica Sometimes por "Les Meravelles", solo por Grua / Son Rigo /
    Marina Plaza / coordenada Sometimes.
  - Las paradas reales del usuario se mantienen como stopover:true.
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

  if (shouldForceSometimesMotorwayAccess(origin, destination)) {
    waypoints.push({
      location: SOMETIMES_MOTORWAY_ACCESS_POINT,
      stopover: false
    });

    console.log(
      "TaxiPro routing rule aplicada: Sometimes/Grua/Son Rigo → acceso autopista 39.533147,2.734151"
    );
  }

  if (shouldForcePaseoMaritimo(origin, destination)) {
  waypoints.push(PASEO_MARITIMO_POINT);

  console.log(
    "TaxiPro routing rule aplicada: Playa de Palma / Can Pastilla hacia Palma por Paseo Maritimo"
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

      const totalDurationBaseSeconds = route.legs.reduce(
  (sum, leg) => sum + (leg.duration?.value || 0),
  0
);

const totalDurationTrafficSeconds = route.legs.reduce(
  (sum, leg) =>
    sum + (leg.duration_in_traffic?.value || leg.duration?.value || 0),
  0
);

const trafficDelaySeconds = Math.max(
  0,
  totalDurationTrafficSeconds - totalDurationBaseSeconds
);

const trafficDelayPercent =
  totalDurationBaseSeconds > 0
    ? trafficDelaySeconds / totalDurationBaseSeconds
    : 0;

resolve({
  distanceKm: totalDistanceMeters / 1000,

  // Duración que usará TAXIPRO para calcular precio.
  durationMinutes: totalDurationTrafficSeconds / 60,

  // Datos adicionales para diagnóstico y visualización.
  durationBaseMinutes: totalDurationBaseSeconds / 60,
  durationTrafficMinutes: totalDurationTrafficSeconds / 60,
  trafficDelayMinutes: trafficDelaySeconds / 60,
  trafficDelayPercent,
  hasTrafficData: route.legs.some((leg) => Boolean(leg.duration_in_traffic))
});
    });
  });
}