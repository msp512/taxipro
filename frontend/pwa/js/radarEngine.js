let radars = [];

export async function loadRadars() {

  const response = await fetch("/assets/radars.json");

  radars = await response.json();

}

export function checkRadars(currentLat, currentLng) {

  const alertDistance = 300; // metros

  for (const radar of radars) {

    const distance = getDistance(
      currentLat,
      currentLng,
      radar.lat,
      radar.lng
    );

    if (distance < alertDistance) {

      return radar;

    }

  }

  return null;

}

function getDistance(lat1, lon1, lat2, lon2) {

  const R = 6371000;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;

}