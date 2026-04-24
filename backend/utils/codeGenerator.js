function randomBlock(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";

  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }

  return out;
}

export function generateInviteCode() {
  return `TAXI-${randomBlock(4)}-${randomBlock(4)}`;
}