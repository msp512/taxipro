const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5001/api"
    : "https://taxipro.onrender.com/api";

export async function calculateFareAPI(distance, duration, city = "Palma") {

  // validación básica
  if (!distance || !duration) {
    throw new Error("Datos inválidos para cálculo");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE}/fare/estimate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        distance,
        duration,
        city
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }

    const data = await response.json();

    return data;

  } catch (error) {

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado");
    }

    throw error;
  }
}