let map;
let directionsService;
let directionsRenderer;

export function initMap() {

  map = new google.maps.Map(
    document.getElementById("map"),
    {
      center: { lat: 39.5696, lng: 2.6502 },
      zoom: 13,
      disableDefaultUI: true
    }
  );

window.initMap = function(){
  console.log("Mapa cargado");
};

  directionsService =
    new google.maps.DirectionsService();

  directionsRenderer =
    new google.maps.DirectionsRenderer({

      suppressMarkers: false,

      polylineOptions: {
        strokeColor: "#0F2A44",
        strokeWeight: 5
      }

    });

  directionsRenderer.setMap(map);
}

export function computeRoute(origin, destination) {

  return new Promise((resolve, reject) => {

    directionsService.route(
      {
        origin,
        destination,
        travelMode: "DRIVING",
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess"
        }
      },
      (result, status) => {

        if (status !== "OK") {
          reject(status);
          return;
        }

        directionsRenderer.setDirections(result);

        const leg = result.routes[0].legs[0];

        const distanceKm =
          leg.distance.value / 1000;

        const durationMinutes =
          leg.duration.value / 60;

        resolve({
          distanceKm,
          durationMinutes
        });

      }
    );

  });

}