export function classifyService({ distance, duration, supplements }) {
  // aeropuerto si lleva suplemento aeropuerto
  if (supplements.includes("airport")) {
    return "airport";
  }

  const speed = (distance / (duration / 60));

  // urbano
  if (speed < 25 && distance < 10) {
    return "urban";
  }

  // carretera
  return "highway";
}