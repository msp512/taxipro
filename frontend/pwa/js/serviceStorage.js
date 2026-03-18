const STORAGE_KEY = "taxipro_services";

/* ===============================
GET ALL SERVICES
=============================== */
export function getStoredServices() {
const data = localStorage.getItem(STORAGE_KEY);
return data ? JSON.parse(data) : [];
}

/* ===============================
SAVE SERVICE
=============================== */
export function saveService(serviceData) {

if (
!serviceData ||
!serviceData.distance_km ||
!serviceData.duration_min ||
!serviceData.estimated_total
) {
console.error("Invalid service data", serviceData);
return;
}

const services = getStoredServices();

services.push({
timestamp: Date.now(),
distance_km: Number(serviceData.distance_km),
duration_min: Number(serviceData.duration_min),
estimated_total: Number(serviceData.estimated_total),
real_total: serviceData.real_total ? Number(serviceData.real_total) : null,
valid: false
});

localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

/* ===============================
CONFIRM LAST SERVICE
=============================== */
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

// ===============================
// VALIDACIÓN CALIDAD (CLAVE)
// ===============================
const deviation =
Math.abs((value - lastService.estimated_total) / lastService.estimated_total) * 100;

const isValid =
lastService.distance_km >= 1 &&
lastService.duration_min >= 3 &&
deviation <= 15;

lastService.valid = isValid;

localStorage.setItem(STORAGE_KEY, JSON.stringify(services));

return true;
}

/* ===============================
GET VALID SERVICES (90 DAYS)
=============================== */
export function getValidServicesLast90Days() {

const services = getStoredServices();
const now = Date.now();
const ninetyDays = 90 * 24 * 60 * 60 * 1000;

return services.filter(service => {
return (
(now - service.timestamp) <= ninetyDays &&
service.valid === true
);
});
}

/* ===============================
CLEAR STORAGE
=============================== */
export function clearAllServices() {
localStorage.removeItem(STORAGE_KEY);
}

/* ===============================
FREQUENT ROUTES
=============================== */
export function getFrequentRoutes() {

const services = getStoredServices();

const counter = {};

services.forEach(s => {

```
if (!s.origin || !s.destination) return;

const key = s.origin + "|" + s.destination;

counter[key] = (counter[key] || 0) + 1;
```

});

const routes = [];

Object.entries(counter).forEach(([key, count]) => {

```
if (count >= 3) {

  const parts = key.split("|");

  routes.push({
    origin: parts[0],
    destination: parts[1],
    count
  });

}
```

});

return routes;
}
