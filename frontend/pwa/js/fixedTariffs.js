function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['`´]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePlace(value = "") {
  const text = normalizeText(value);

  const aliases = {
    "aeroport": "aeroport",
    "aeropuerto": "aeroport",
    "aeropuerto palma": "aeroport",
    "aeropuerto de palma": "aeroport",
    "aeropuerto de palma de mallorca": "aeroport",
    "farmacia aeropuerto palma terminal de salidas palma": "aeroport",
    "farmacia aeropuerto palma terminal de salidas": "aeroport",
    "pmi": "aeroport",

    "can pastilla": "can pastilla",
    "can pastilla 1": "can pastilla 1",
    "can pastilla 2": "can pastilla 2",
    "sometimes": "sometimes",
    "riu": "riu",
    "america": "america",
    "américa": "america",
    "arenal": "arenal",
    "aqualand": "aqualand",
    "molinar": "molinar",
    "cala gamba": "cala gamba",

    "puerto de palma de mallorca": "palma maritimo",
    "puerto palma": "palma maritimo",
    "puerto de palma": "palma maritimo",
    "palma maritimo": "palma maritimo",
    "palma maritimo espana": "palma maritimo",
    "palma maritimo españa": "palma maritimo",
    "palma maritimo palma espana": "palma maritimo",

    "porto pi": "palma porto pi",
    "palma porto pi": "palma porto pi",
    "palma porto pi espana": "palma porto pi",
    "palma porto pi españa": "palma porto pi",

    "palma centro": "palma centro",
    "palma centro espana": "palma centro",
    "palma centro españa": "palma centro",
    "palma centro palma": "palma centro",
    "palma centro palma espana": "palma centro",
    "plaza de espana palma de mallorca": "palma centro",
    "plaza de españa palma de mallorca": "palma centro",
    "plaza de espana": "palma centro",
    "plaza de españa": "palma centro",

    "hospital son espases palma": "hospital son espases",
    "hospital son espases palma espana": "hospital son espases",
    "hospital son espases palma españa": "hospital son espases",
    "hospital son espases": "hospital son espases",

    "cala mayor": "cala major",
    "cala major": "cala major",
    "cala major palma espana": "cala major",
    "cala major palma españa": "cala major",
    "cala major palma": "cala major",

    "palma nova": "palma nova",
    "santa ponsa": "santa ponca",
    "santa ponca": "santa ponca",
    "valldemossa": "valldemossa",
    "soller": "soller",
    "port de soller": "port de soller",
    "genova": "genova",
    "illetes": "illetes",
    "magalluf": "magalluf",
    "son vida": "son vida",
    "son espases": "hospital son espases",
    "puerto": "palma maritimo",
    "centro": "palma centro"
  };

  return aliases[text] || text;
}

function includesNormalized(rawValue = "", targetKey = "") {
  const normalized = normalizeText(rawValue);
  if (!normalized || !targetKey) return false;
  return normalized.includes(targetKey);
}

function dedupeTariffs(items) {
  const seen = new Map();

  for (const item of items) {
    const origenKey = normalizePlace(item.origen);
    const destinoKey = normalizePlace(item.destino);
    const key = `${origenKey}|${destinoKey}|${item.tarifa}`;

    seen.set(key, {
      ...item,
      origenKey,
      destinoKey
    });
  }

  return Array.from(seen.values());
}

const rawAgencyTariffs = [
  { origen: "Aeroport", destino: "Alaró", precio: 47.65, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Alcudia", precio: 84.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Alfabia(Jardins)", precio: 40.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Algaida", precio: 35.42, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Alqueria Blanca", precio: 78.15, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Andratx", precio: 61.08, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Arenal (Llucmajor)", precio: 26.65, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Arenal (Palma)", precio: 23.58, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Ariany", precio: 77.12, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Arta", precio: 107.17, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Aucanada", precio: 99.33, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Bahia Azul", precio: 35.88, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Bahia Grande", precio: 37.93, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Banyalbufar", precio: 62.96, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Barquerets", precio: 89.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Bendinat", precio: 35.42, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Betlem", precio: 109.95, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Binali", precio: 48.86, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Biniagual", precio: 52.53, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Biniamar", precio: 53.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Biniaraix", precio: 63.52, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Binibona", precio: 65.97, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Binissalem", precio: 45.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Bonany", precio: 70.87, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Búger", precio: 64.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Bunyola", precio: 41.53, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "C'as Catalá", precio: 34.20, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "C'as Concos", precio: 80.63, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Caimari", precio: 63.52, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Anguila", precio: 89.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Antena", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Barbacana", precio: 89.07, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Barca", precio: 83.08, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Blava", precio: 26.65, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Bona", precio: 98.95, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala D'Or", precio: 89.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Domingos", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Egos", precio: 85.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Esmeralda", precio: 85.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Ferrera", precio: 89.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Figuera (Calvia)", precio: 60.89, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Figuera (Santanyi)", precio: 80.05, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Fornells", precio: 54.98, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Gat", precio: 112.39, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Guya", precio: 113.62, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Llamp", precio: 65.97, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Llombards", precio: 73.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Major", precio: 30.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Mandia", precio: 89.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Marsal", precio: 84.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Mayor-Globalia", precio: 54.58, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Mesquida", precio: 117.27, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Millor", precio: 100.16, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Mondrago", precio: 81.85, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Moreia", precio: 95.29, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Morlanda", precio: 97.73, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Murada", precio: 92.83, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Pi", precio: 36.60, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Ratjada", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Romantica", precio: 36.60, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Sant Vicenç", precio: 58.82, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Santany", precio: 76.97, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Serena", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Tropicana", precio: 78.43, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Tuent", precio: 54.89, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala Vinyes", precio: 48.86, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cala de Sa Torre", precio: 84.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cales de Mallorca", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Calobra", precio: 112.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Calonge", precio: 84.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Calvia", precio: 65.35, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Camp de Mar", precio: 61.50, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Campanet", precio: 40.22, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Campos", precio: 52.53, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Can Pastilla", precio: 18.45, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Can Picafort", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Canyamel", precio: 111.17, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Capdella", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Capdepera", precio: 108.72, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Caubet", precio: 36.64, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Coll d'en Rebasa", precio: 18.45, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Colonia Sant Jordi", precio: 69.63, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Colonia Sant Pere", precio: 108.72, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Consell", precio: 40.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Costa d'en Blanes", precio: 40.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Costa de la Calma", precio: 24.09, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Costa dels Pins", precio: 111.17, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Costitx", precio: 56.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Coves d'Arta", precio: 113.62, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Coves de Campanet", precio: 96.73, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Coves del Drach", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Coves dels Hams", precio: 86.74, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Cura", precio: 86.74, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Deia", precio: 60.79, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Delfinarium", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Delta/Maioris (Hotel)", precio: 30.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Dique del Oeste", precio: 29.73, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "El Dorado", precio: 38.95, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "El Toro", precio: 101.39, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Escorca", precio: 89.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Esporles", precio: 37.86, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Estellencs", precio: 68.03, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Felanitx", precio: 68.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Font de sa cala", precio: 112.39, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Formentor", precio: 105.06, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Formentor (Faro)", precio: 118.50, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Fornalutx", precio: 64.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Galilea", precio: 53.22, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Genova", precio: 30.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Globalia", precio: 56.38, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Golf Sta Ponça", precio: 112.39, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Hilton (Hotel)", precio: 96.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Illetes", precio: 39.21, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Inca", precio: 92.83, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "La Granja", precio: 44.44, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Llombards", precio: 97.73, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Lloret de Vistalegre", precio: 112.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Lloseta", precio: 54.89, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Llubí", precio: 74.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Lluc", precio: 89.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Llucalcari", precio: 70.09, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Llucmajor", precio: 64.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Magalluf", precio: 49.67, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Maioris", precio: 30.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Mal Pas", precio: 95.43, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Manacor", precio: 75.83, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Mancor de la Vall", precio: 45.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Marratxi", precio: 36.60, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "María de la Salut", precio: 65.35, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Montuiri", precio: 48.36, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Moscari", precio: 67.97, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Muro", precio: 78.43, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Olleries", precio: 33.99, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Orient", precio: 58.82, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Paguera", precio: 59.96, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Palma (Centro)", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Palma (Maritimo)", precio: 26.65, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Palma (Porto Pi)", precio: 28.70, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Palma Nova", precio: 46.88, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Palmanyola", precio: 37.90, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Petra", precio: 69.28, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Pina", precio: 48.36, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Playa de Muro", precio: 65.97, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Playa de Palma", precio: 22.55, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Playa de Son Moll", precio: 111.17, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Pollença", precio: 53.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Porreres", precio: 53.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port Adriano", precio: 40.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port Nou", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port d'Alcudia", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port d'Andratx", precio: 65.97, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port de Pollença", precio: 95.29, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port de Soller", precio: 62.91, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Port de Valldemossa", precio: 61.45, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Portals Nous", precio: 40.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Portals Vells", precio: 53.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Porto Colom", precio: 68.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Porto Cristo", precio: 89.07, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Porto Cristo Novo", precio: 90.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Porto Petro", precio: 86.74, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Portol", precio: 31.76, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Puig Major", precio: 109.09, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Puigpunyent", precio: 40.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Raixa", precio: 35.42, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Randa", precio: 45.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Ruberts", precio: 53.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "S'Arracó", precio: 67.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "S'Esglaieta", precio: 34.20, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "S'Estanyol", precio: 63.52, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "S'Horta", precio: 79.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "S'lllot", precio: 96.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sa Cabaneta", precio: 29.32, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sa Coma", precio: 97.73, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sa Mola (Andratx)", precio: 68.41, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sa Pobla", precio: 69.63, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sa Rapita", precio: 64.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sant Elm", precio: 75.74, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sant Joan", precio: 56.19, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sant Llorenç", precio: 85.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sant Salvador", precio: 81.99, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Santa Eugenia", precio: 35.42, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Santa Margalida", precio: 70.87, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Santa Maria", precio: 35.42, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Santa Ponça", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Santanyí", precio: 70.87, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Selva", precio: 62.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sencelles", precio: 51.30, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Ses Rotes", precio: 35.42, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Ses Salines", precio: 64.75, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Sineu", precio: 52.53, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Soller", precio: 55.92, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Amar", precio: 36.60, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Antem (Golf)", precio: 36.60, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Caliu", precio: 41.53, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Carrió", precio: 85.51, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Ferrer", precio: 47.65, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Massia", precio: 83.08, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Serra de Marina", precio: 94.06, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Servera", precio: 95.29, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Termes", precio: 34.20, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Son Vida", precio: 29.73, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Valldemossa", precio: 48.36, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Vallgornera", precio: 61.43, tarifa: "Agencias" },
  { origen: "Aeroport", destino: "Vilafranca de Bonany", precio: 65.35, tarifa: "Agencias" }
];

export const agencyTariffs = dedupeTariffs(rawAgencyTariffs);

export const hotelTariffs = dedupeTariffs([
  { origen: "Aeroport", destino: "Can Pastilla 1", precio: 13.00, tarifa: "Traslados Hotel" },
  { origen: "Aeroport", destino: "Can Pastilla 2", precio: 13.00, tarifa: "Traslados Hotel" },
  { origen: "Aeroport", destino: "Sometimes", precio: 16.00, tarifa: "Traslados Hotel" },
  { origen: "Aeroport", destino: "Riu", precio: 17.00, tarifa: "Traslados Hotel" },
  { origen: "Aeroport", destino: "América", precio: 18.50, tarifa: "Traslados Hotel" },
  { origen: "Aeroport", destino: "Arenal", precio: 20.00, tarifa: "Traslados Hotel" }
]);

export const stipulatedTariffs = dedupeTariffs([
  { origen: "Aeroport", destino: "Molinar", precio: 15.00, tarifa: "Estipulados" },
  { origen: "Aeroport", destino: "Cala Gamba", precio: 15.00, tarifa: "Estipulados" },
  { origen: "Aeroport", destino: "Can Pastilla", precio: 14.00, tarifa: "Estipulados" },
  { origen: "Aeroport", destino: "Sometimes", precio: 17.00, tarifa: "Estipulados" },
  { origen: "Aeroport", destino: "Riu", precio: 18.00, tarifa: "Estipulados" },
  { origen: "Aeroport", destino: "América", precio: 19.00, tarifa: "Estipulados" },
  { origen: "Aeroport", destino: "Arenal", precio: 20.00, tarifa: "Estipulados" }
]);

export const transferMatrix = {
  aeropuerto: {
    "can pastilla 1": 13,
    "can pastilla 2": 13,
    "sometimes": 16,
    "riu": 17,
    "america": 18.5,
    "arenal": 20
  },
  "can pastilla 1": {
    "aeropuerto": 13,
    "can pastilla 1": 6,
    "can pastilla 2": 7,
    "sometimes": 8,
    "riu": 9,
    "america": 10,
    "arenal": 11,
    "aqualand": 12
  },
  "can pastilla 2": {
    "aeropuerto": 13,
    "can pastilla 1": 7,
    "can pastilla 2": 6,
    "sometimes": 7,
    "riu": 8,
    "america": 9,
    "arenal": 10,
    "aqualand": 11
  },
  "sometimes": {
    "aeropuerto": 16,
    "can pastilla 1": 8,
    "can pastilla 2": 7,
    "sometimes": 6,
    "riu": 7,
    "america": 8,
    "arenal": 9,
    "aqualand": 10
  },
  "riu": {
    "aeropuerto": 17,
    "can pastilla 1": 9,
    "can pastilla 2": 8,
    "sometimes": 7,
    "riu": 6,
    "america": 7,
    "arenal": 8,
    "aqualand": 9
  },
  "america": {
    "aeropuerto": 18.5,
    "can pastilla 1": 10,
    "can pastilla 2": 9,
    "sometimes": 8,
    "riu": 7,
    "america": 6,
    "arenal": 7,
    "aqualand": 8
  },
  "arenal": {
    "aeropuerto": 20,
    "can pastilla 1": 11,
    "can pastilla 2": 10,
    "sometimes": 9,
    "riu": 8,
    "america": 7,
    "arenal": 6,
    "aqualand": 7
  },
  "aqualand": {
    "can pastilla 1": 12,
    "can pastilla 2": 11,
    "sometimes": 10,
    "riu": 9,
    "america": 8,
    "arenal": 7
  }
};

function normalizeMatrixKey(value = "") {
  const key = normalizePlace(value);

  const aliases = {
    "aeroport": "aeropuerto",
    "aeropuerto": "aeropuerto",
    "can pastilla": "can pastilla 1",
    "america": "america"
  };

  return aliases[key] || key;
}

function findByFlexibleMatch(items, origin, destination) {
  const originKey = normalizePlace(origin);
  const destinationKey = normalizePlace(destination);

  let exact = items.find(
    item =>
      item.origenKey === originKey &&
      item.destinoKey === destinationKey
  );

  if (exact) return exact;

  exact = items.find(
    item =>
      item.origenKey === originKey &&
      includesNormalized(destination, item.destinoKey)
  );

  if (exact) return exact;

  exact = items.find(
    item =>
      includesNormalized(origin, item.origenKey) &&
      item.destinoKey === destinationKey
  );

  if (exact) return exact;

  exact = items.find(
    item =>
      includesNormalized(origin, item.origenKey) &&
      includesNormalized(destination, item.destinoKey)
  );

  return exact || null;
}

export function findFixedAgencyTariff(origin, destination) {
  return findByFlexibleMatch(agencyTariffs, origin, destination);
}

export function findFixedHotelTariff(origin, destination) {
  return findByFlexibleMatch(hotelTariffs, origin, destination);
}

export function findFixedStipulatedTariff(origin, destination) {
  return findByFlexibleMatch(stipulatedTariffs, origin, destination);
}

export function findTransferMatrixPrice(origin, destination) {
  const originKey = normalizeMatrixKey(origin);
  const destinationKey = normalizeMatrixKey(destination);

  if (transferMatrix[originKey]?.[destinationKey] != null) {
    return {
      origen: origin,
      destino: destination,
      precio: transferMatrix[originKey][destinationKey],
      tarifa: "Matriz Traslados"
    };
  }

  return null;
}

export function getQuickDestinationByMode(key, mode = "taxipro") {
  const map = {
    taxipro: {
      airport: "Farmacia Aeropuerto Palma, Terminal de Salidas, Palma",
      port: "Puerto de Palma de Mallorca",
      hospital: "Hospital Son Espases, Palma",
      center: "Plaça de la Reina, Palma, Mallorca"
    },
    agency: {
      airport: "Aeroport",
      port: "Palma (Maritimo)",
      hospital: "Hospital Son Espases",
      center: "Palma (Centro)"
    },
    stipulated: {
      airport: "Aeroport",
      port: "Palma (Maritimo)",
      hospital: "Hospital Son Espases",
      center: "Palma (Centro)"
    },
    transfer: {
      airport: "Aeroport",
      port: "Palma (Maritimo)",
      hospital: "Hospital Son Espases",
      center: "Palma (Centro)"
    }
  };

  return map[mode]?.[key] || map.taxipro[key] || "";
}