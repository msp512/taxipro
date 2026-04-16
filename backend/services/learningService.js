export async function getRecentServices(db, type) {
  const result = await db.query(`
    SELECT deviation
    FROM services
    WHERE created_at > NOW() - INTERVAL '7 days'
    AND type = $1
  `, [type]);

  return result.rows;
}