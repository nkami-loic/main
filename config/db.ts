import mysql, { Pool } from "mysql2";

const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

const testConnection = async (): Promise<boolean> => {
  try {
    const [rows] = await promisePool.query("SELECT 1 + 1 AS result");
    console.log("✅ Connexion à la base de données réussie");
    console.log(`📊 Base de données: ${process.env.DB_NAME}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error("❌ Erreur de connexion à la base de données:", err.message);
    return false;
  }
};

testConnection();

export { promisePool as pool, testConnection };
