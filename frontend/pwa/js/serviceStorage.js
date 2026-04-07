const STORAGE_KEY = "taxipro_services";

export function getStoredServices() {
  const data = localStorage.getItem(STORAGE_KEY);

  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error leyendo servicios guardados:", error);
    return [];
  }
}

export function saveService(serviceData) {
  if (
    !serviceData ||
    serviceData.distance_km == null ||
    serviceData.duration_min == null ||
    serviceData.estimated_total == null
  ) {
    console.error("Invalid service data", serviceData);
    return false;
  }

  const services = getStoredServices();

  services.push({
    timestamp: Date.now(),
    distance_km: Number(serviceData.distance_km),
    duration_min: Number(serviceData.duration_min),
    estimated_total: Number(serviceData.estimated_total),
    real_total: serviceData.real_total != null ? Number(serviceData.real_total) : null,
    origin: serviceData.origin || null,
    destination: serviceData.destination || null,
    valid: false
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  return true;
}

export function confirmLastService(realAmount) {
  const services = getStoredServices();
  if (services.length === 0) return false;

  const value = parseFloat(realAmount);
  if (isNaN(value) || value <= 0) {
    console.error("Invalid real amount:", realAmount);
    return false;
  }

  const lastService = services[services.length - 1];
  lastService.real_total = value;

  const deviation =
    Math.abs((value - lastService.estimated_total) / lastService.estimated_total) * 100;

  lastService.valid = (
    lastService.distance_km >= 1 &&
    lastService.duration_min >= 3 &&
    deviation <= 15
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  return true;
}

export function getValidServicesLast90Days() {
  const services = getStoredServices();
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  return services.filter((service) => {
    return (now - service.timestamp) <= ninetyDays && service.valid === true;
  });
}

export function clearAllServices() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getFrequentRoutes() {
  const services = getStoredServices();
  const counter = {};

  services.forEach((service) => {
    if (!service.origin || !service.destination) return;
    const key = `${service.origin}|${service.destination}`;
    counter[key] = (counter[key] || 0) + 1;
  });

  return Object.entries(counter)
    .filter(([, count]) => count >= 3)
    .map(([key, count]) => {
      const [origin, destination] = key.split("|");
      return { origin, destination, count };
    });
}
