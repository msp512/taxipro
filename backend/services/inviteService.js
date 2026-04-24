import { generateInviteCode } from "../utils/codeGenerator.js";

export async function createUniqueInviteCode(db, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateInviteCode();

    const { rows } = await db.query(
      "select id from access_invites where code = $1 limit 1",
      [code]
    );

    if (rows.length === 0) {
      return code;
    }
  }

  throw new Error("No se pudo generar un código único de invitación");
}