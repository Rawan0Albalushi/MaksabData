import "dotenv/config";
import mysql from "mysql2/promise";

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USERNAME || "root";
const password = process.env.DB_PASSWORD || "";
const database = process.env.DB_DATABASE || "maksab";

console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

try {
  const connection = await mysql.createConnection({ host, port, user, password });
  console.log("Connected to MySQL successfully.");

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`Database \`${database}\` is ready.`);

  const [rows] = await connection.query("SHOW DATABASES");
  const exists = rows.some((r) => Object.values(r)[0] === database);
  console.log(exists ? `Verified: \`${database}\` exists.` : `Warning: \`${database}\` not found.`);

  await connection.end();
  process.exit(0);
} catch (err) {
  console.error("MySQL connection failed:", err.message);
  console.error("Full error:", err);
  process.exit(1);
}
