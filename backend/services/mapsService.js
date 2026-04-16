export async function computeRouteWithStops({ origin, stops = [], destination }) {
  try {
    const waypoints = stops.map(stop => ({
      location: stop,
      stopover: true
    }));

    // ⚠️ aquí debes usar tu integración actual con Google Maps
    const result = await global.googleMapsClient.directions({
      params: {
        origin,
        destination,
        waypoints,
        departure_time: "now",
        traffic_model: "best_guess"
      }
    });

    const route = result.data.routes[0];

    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach(leg => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration_in_traffic
        ? leg.duration_in_traffic.value
        : leg.duration.value;
    });

    return {
      distance_km: Number((totalDistance / 1000).toFixed(2)),
      duration_min: Number((totalDuration / 60).toFixed(1))
    };

  } catch (error) {
    throw new Error("Route calculation failed");
  }
}