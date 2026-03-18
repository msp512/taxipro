export function saveTaxiId(taxiId) {

  localStorage.setItem("taxipro_taxi_id", taxiId);

}

export function getTaxiId() {

  return localStorage.getItem("taxipro_taxi_id");

}