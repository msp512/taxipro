let map;
let directionsService;
let directionsRenderer;

const BABALU_POINT = {
  lat: 39.54001187908689,
  lng: 2.7127578235862595
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCanPastillaArea(text) {
  const t = normalizeText(text);
  return (
    t.includes("can pastilla") ||
    t.includes("playa de palma") ||
    t.includes("hotel las arenas") ||
    t.includes("aeropuerto de palma")
  );
}

function isCollDenRabassaArea(text) {
  const t = normalizeText(text);
  return (
    t.includes("coll den rabassa") ||
    t.includes("coll d'en rabassa") ||
    t.includes("coll d en rabassa") ||
    t.includes("es coll den rabassa")
  );
}

function shouldForceBabaluAccess(origin, destination) {
  return isCanPastillaArea(origin) && isCollDenRabassaArea(destination);
}

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

export function computeRoute(origin, destination) {
  return new Promise((resolve, reject) => {
    if (!directionsService || !directionsRenderer) {
      reject(new Error("Mapa no inicializado"));
      return;
    }

    const waypoints = [];

    if (shouldForceBabaluAccess(origin, destination)) {
      waypoints.push({
        location: BABALU_POINT,
        stopover: false
      });
      console.log("TaxiPro routing rule aplicada: acceso Babalu forzado");
    }

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: false,
        travelMode: "DRIVING",
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess"
        }
      },
      (result, status) => {
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
      }
    );
  });
}