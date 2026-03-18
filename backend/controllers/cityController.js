import crypto from "crypto";
import db from "../db.js";

export async function updateCityConfig(req, res) {
  try {

    const { city, config } = req.body;

    const timestamp = new Date().toISOString();
    const version = `${city}_${timestamp}`;

    const signature = crypto
      .createHash("sha256")
      .update(JSON.stringify(config))
      .digest("hex");

    const updatedBy = req.user.email;

    await db.query(
      `INSERT INTO city_config_versions 
       (city, version, config, signature, updated_by, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [city, version, config, signature, updatedBy, timestamp]
    );

    res.json({ message: "New config version created", version });

  } catch (error) {
    console.error("ERROR EN updateCityConfig:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}