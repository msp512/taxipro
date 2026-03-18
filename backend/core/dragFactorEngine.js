export function calculateDragFactor(speed) {

  // curva continua simple
  // más lento → más factor
  // más rápido → menos factor

  let factor = 0.04 - (speed * 0.0012);

  return clamp(factor);
}

function clamp(value) {
  const min = 0.005;
  const max = 0.04;

  return Math.min(Math.max(value, min), max);
}