export const DEFAULT_TARIFF_PROFILE_ID = "PALMA_MALLORCA_2026";

export const TARIFF_PROFILES = {
  PALMA_MALLORCA_2026: {
    id: "PALMA_MALLORCA_2026",
    label: "Palma de Mallorca / Mallorca · 2026",
    jurisdiction: "Palma de Mallorca / Mallorca",
    currency: "EUR",

    sourceLabel:
      "Tarifa referencia Mallorca 2025 + tarifas interurbanas Mallorca 2022",
    sourceNote:
      "T1/T2 según tarifa de referencia Mallorca 2025. T3/T4 según circular interurbana Mallorca 2022 con parámetros de taxímetro.",

    tariffs: {
      T1: {
        code: "T1",
        name: "Tarifa 1 · Urbana diurna",
        reason: "Urbana laborable entre 07:00 y 21:00",
        scope: "urban",
        period: "day",

        startHour: 7,
        endHour: 21,

        flagfall: 2.5,
        priceKm: 1.2,
        waitingHour: 19.4,

        // Parámetros derivados desde tarifa oficial:
        // salto 0,05 € / 1,20 €/km = 41,67 m
        // salto 0,05 € / 19,40 €/h = 9,28 s
        jumpValue: 0.05,
        metersPerJump: 41.67,
        secondsPerJump: 9.28,
        speedLimitKmh: 16.17,
        includedKm: 0
      },

      T2: {
        code: "T2",
        name: "Tarifa 2 · Urbana nocturna/festiva",
        reason: "Urbana nocturna, sábado, domingo o festivo",
        scope: "urban",
        period: "nightHoliday",

        startHour: 21,
        endHour: 7,

        flagfall: 2.85,
        priceKm: 1.35,
        waitingHour: 21.4,

        // Parámetros derivados desde tarifa oficial:
        // salto 0,05 € / 1,35 €/km = 37,04 m
        // salto 0,05 € / 21,40 €/h = 8,41 s
        jumpValue: 0.05,
        metersPerJump: 37.04,
        secondsPerJump: 8.41,
        speedLimitKmh: 15.85,
        includedKm: 0
      },

      T3: {
        code: "T3",
        name: "Tarifa 3 · Interurbana diurna",
        reason: "Interurbana diurna entre 06:00 y 21:00",
        scope: "interurban",
        period: "day",

        startHour: 6,
        endHour: 21,

        flagfall: 3.31,
        priceKm: 0.58,
        waitingHour: 19.52,

        // Parámetros oficiales de programación del taxímetro interurbano.
        jumpValue: 0.2,
        metersPerJump: 172.41,
        secondsPerJump: 36.89,
        speedLimitKmh: 16.83,

        // La bajada interurbana incluye primer km de ida y vuelta.
        // Con los saltos oficiales NO duplicamos distancia.
        includedKm: 1
      },

      T4: {
        code: "T4",
        name: "Tarifa 4 · Interurbana nocturna/festiva",
        reason: "Interurbana nocturna, sábado tarde, domingo o festivo",
        scope: "interurban",
        period: "nightHoliday",

        startHour: 21,
        endHour: 6,

        flagfall: 4.25,
        priceKm: 0.66,
        waitingHour: 18.98,

        // Parámetros oficiales de programación del taxímetro interurbano.
        jumpValue: 0.2,
        metersPerJump: 151.52,
        secondsPerJump: 37.93,
        speedLimitKmh: 14.35,

        // La bajada interurbana incluye primer km de ida y vuelta.
        // Con los saltos oficiales NO duplicamos distancia.
        includedKm: 1
      }
    },

    supplements: {
      // Urbanos / tarifa referencia Mallorca
      airport_t12: {
        label: "Aeropuerto / Puerto · T1/T2",
        amount: 4.65,
        scope: "urban"
      },
      port_t12: {
        label: "Puerto · T1/T2",
        amount: 4.65,
        scope: "urban"
      },
      radio_t12: {
        label: "Emisora · T1/T2",
        amount: 1.15,
        scope: "urban"
      },
      mountain1_t12: {
        label: "Montaña 1 · T1/T2",
        amount: 8.52,
        scope: "urban"
      },
      mountain2_t12: {
        label: "Montaña 2 · T1/T2",
        amount: 4.26,
        scope: "urban"
      },
      passengers_5_6_t12: {
        label: "5 o 6 pasajeros · T1/T2",
        amount: 3.0,
        scope: "urban"
      },
      passengers_7_8_t12: {
        label: "7 u 8 pasajeros · T1/T2",
        amount: 6.0,
        scope: "urban"
      },

      // Interurbanos / circular Mallorca 2022
      airport_t34: {
        label: "Aeropuerto / Puertos · T3/T4",
        amount: 3.08,
        scope: "interurban"
      },
      port_t34: {
        label: "Puerto · T3/T4",
        amount: 3.08,
        scope: "interurban"
      },
      radio_t34: {
        label: "Radioteléfono · T3/T4",
        amount: 1.11,
        scope: "interurban"
      },
      mountain1_t34: {
        label: "Montaña 1 · T3/T4",
        amount: 4.26,
        scope: "interurban"
      },
      mountain2_t34: {
        label: "Montaña 2 · T3/T4",
        amount: 8.52,
        scope: "interurban"
      },

      // Especiales
      holiday_special: {
        label: "Navidad / Fin de Año",
        amount: 4.75,
        scope: "urban"
      },
      christmas_special: {
        label: "Navidad / Fin de Año",
        amount: 4.75,
        scope: "urban"
      },

      // Compatibilidad antigua frontend
      airport: {
        label: "Aeropuerto / Puerto",
        amount: 4.65,
        scope: "urban"
      },
      port: {
        label: "Puerto",
        amount: 4.65,
        scope: "urban"
      },
      radio: {
        label: "Emisora",
        amount: 1.15,
        scope: "urban"
      },
      christmas: {
        label: "Navidad / Fin de Año",
        amount: 4.75,
        scope: "urban"
      },
      mountain1: {
        label: "Montaña 1",
        amount: 8.52,
        scope: "urban"
      },
      mountain2: {
        label: "Montaña 2",
        amount: 4.26,
        scope: "urban"
      }
    },

    supplementAliases: {
      airport: {
        urban: "airport_t12",
        interurban: "airport_t34"
      },
      port: {
        urban: "port_t12",
        interurban: "port_t34"
      },
      radio: {
        urban: "radio_t12",
        interurban: "radio_t34"
      },
      mountain1: {
        urban: "mountain1_t12",
        interurban: "mountain1_t34"
      },
      mountain2: {
        urban: "mountain2_t12",
        interurban: "mountain2_t34"
      },
      christmas: {
        urban: "christmas_special",
        interurban: null
      },
      holiday_special: {
        urban: "holiday_special",
        interurban: null
      }
    },

    rules: {
      urbanDayStartHour: 7,
      urbanNightStartHour: 21,

      interurbanDayStartHour: 6,
      interurbanNightStartHour: 21,

      sundayIsHoliday: true,
      saturdayIsUrbanHoliday: true,
      saturdayAfternoonIsInterurbanHoliday: true,
      saturdayAfternoonStartHour: 14,

      localHolidaysEnabled: false,

      mutuallyExclusiveSupplements: [
        ["mountain1", "mountain2"],
        ["mountain1_t12", "mountain2_t12"],
        ["mountain1_t34", "mountain2_t34"]
      ],

      airportMinimumFare: {
        enabled: true,
        amount: 16.95,
        appliesWhenOriginIsAirport: true
      }
    },

    urbanScopeKeywords: [
      "palma",
      "palma de mallorca",
      "plaça de la reina",
      "plaza de la reina",

      "son espases",
      "hospital son espases",

      "son llàtzer",
      "son llatzer",
      "hospital son llàtzer",
      "hospital son llatzer",

      "aeroport",
      "aeropuerto",
      "aeropuerto de palma",
      "aeroport de palma",

      "can pastilla",
      "coll d'en rabassa",
      "coll den rabassa",

      "playa de palma",
      "platja de palma",
      "s'arenal",
      "el arenal",
      "arenal",

      "puerto de palma",
      "port de palma",
      "estación marítima",
      "estacion maritima",
      "estació marítima",
      "estacio maritima",

      "universitat de les illes balears",
      "universidad de las illes balears",
      "universidad de les illes balears",
      "uib",

      "mallorca fashion outlet",
      "fashion outlet",
      "festival park",
      "marratxi",
      "marratxí"
    ]
  }
};

export function getTariffProfile(profileId = DEFAULT_TARIFF_PROFILE_ID) {
  return TARIFF_PROFILES[profileId] || TARIFF_PROFILES[DEFAULT_TARIFF_PROFILE_ID];
}

export function getTariffProfileByCity(city = "") {
  const normalizedCity = String(city || "").trim().toLowerCase();

  if (
    normalizedCity.includes("palma") ||
    normalizedCity.includes("mallorca") ||
    normalizedCity.includes("interurb") ||
    normalizedCity === ""
  ) {
    return getTariffProfile("PALMA_MALLORCA_2026");
  }

  return getTariffProfile("PALMA_MALLORCA_2026");
}