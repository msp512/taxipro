export function getHourTrafficFactor(inputHour = null) {

  const hour = inputHour ?? new Date().getHours();

  if (hour >= 7 && hour < 9) return 1.10;
  if (hour >= 9 && hour < 12) return 1.05;
  if (hour >= 12 && hour < 15) return 1.05;
  if (hour >= 15 && hour < 17) return 1.00;
  if (hour >= 17 && hour < 20) return 1.10;
  if (hour >= 20 && hour < 23) return 1.05;

  return 1.00;
}