/*
  TAXIPRO — calendarios de festivos
  Primera versión modular B3.6. Este módulo solo informa si una fecha es festiva;
  la aplicación de la tarifa corresponde al motor de cálculo.
*/

export const holidayCalendars = {
  spain_2026: [
    { date: "2026-01-01", name: "Año Nuevo", scope: "national" },
    { date: "2026-01-06", name: "Epifanía del Señor", scope: "national" },
    { date: "2026-05-01", name: "Fiesta del Trabajo", scope: "national" },
    { date: "2026-08-15", name: "Asunción de la Virgen", scope: "national" },
    { date: "2026-10-12", name: "Fiesta Nacional de España", scope: "national" },
    { date: "2026-11-01", name: "Todos los Santos", scope: "national" },
    { date: "2026-12-06", name: "Día de la Constitución", scope: "national" },
    { date: "2026-12-08", name: "Inmaculada Concepción", scope: "national" },
    { date: "2026-12-25", name: "Navidad", scope: "national" }
  ],

  balears_2026: [
    { date: "2026-03-01", name: "Día de les Illes Balears", scope: "autonomic" }
  ],

  palma_2026: [
    { date: "2026-01-20", name: "Sant Sebastià", scope: "local", municipality: "Palma" }
  ]
};

function normalizeDate(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isHoliday({
  date,
  municipality = "Palma",
  autonomousCommunity = "Balears",
  country = "Spain"
} = {}) {
  const targetDate = normalizeDate(date || new Date());
  const normalizedMunicipality = normalizeText(municipality);
  const normalizedAutonomy = normalizeText(autonomousCommunity);
  const normalizedCountry = normalizeText(country);

  const calendarKeys = [];

  if (normalizedCountry === "spain" || normalizedCountry === "espana") {
    calendarKeys.push("spain_2026");
  }

  if (normalizedAutonomy.includes("balears") || normalizedAutonomy.includes("baleares")) {
    calendarKeys.push("balears_2026");
  }

  if (normalizedMunicipality === "palma") {
    calendarKeys.push("palma_2026");
  }

  for (const key of calendarKeys) {
    const match = (holidayCalendars[key] || []).find(
      (holiday) => holiday.date === targetDate
    );

    if (match) {
      return {
        isHoliday: true,
        calendar: key,
        matchedHoliday: match
      };
    }
  }

  return {
    isHoliday: false,
    calendar: null,
    matchedHoliday: null
  };
}
