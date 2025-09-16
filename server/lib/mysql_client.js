import mysql from 'mysql2/promise';

let pool;

export async function getConnection() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const connection = await getConnection();
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('✅ MySQL database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error);
    return false;
  }
}

export async function disconnect() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
