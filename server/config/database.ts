import dotenv from 'dotenv';
import { query } from '../lib/mysql_client.js';

// Load environment variables at the beginning
dotenv.config();

// Export MySQL query function as sql for compatibility
export { query as sql };

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

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'viewer' NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add role column if it doesn't exist (for existing databases)
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'viewer' NOT NULL
    `);

    // Create products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        sku VARCHAR(255) NOT NULL UNIQUE,
        modelo VARCHAR(255),
        marca VARCHAR(255),
        familia VARCHAR(255),
        descripcion TEXT,
        caracteristicas TEXT,
        precio_usd_sin_iva DECIMAL(10,2),
        precio_usd_con_iva DECIMAL(10,2),
        precio_compra DECIMAL(10,2),
        iva_percent DECIMAL(5,2) DEFAULT 21,
        stock TEXT DEFAULT 'Sin Stock',
        combustible VARCHAR(255),
        potencia VARCHAR(255),
        motor VARCHAR(255),
        cabina VARCHAR(255),
        tta_incluido BOOLEAN DEFAULT FALSE,
        url_pdf TEXT,
        instagram_feed_url_1 TEXT,
        instagram_feed_url_2 TEXT,
        instagram_feed_url_3 TEXT,
        instagram_story_url_1 TEXT,
        mercado_libre_url_1 TEXT,
        web_generica_url_1 TEXT,
        url_ficha_html TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create file_uploads table
    await query(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(255) NOT NULL,
        size INT NOT NULL,
        gcs_url TEXT NOT NULL,
        product_id CHAR(36),
        upload_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `);

    // Create default admin user from environment variables (required)
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;

    if (!adminUsername || !adminPassword || !adminEmail) {
      console.log('⚠️ Skipping admin user creation - DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, and DEFAULT_ADMIN_EMAIL environment variables are required');
      console.log('✅ MySQL database tables initialized');
      return;
    }

    const userResult = await query('SELECT COUNT(*) as count FROM users WHERE username = ?', [adminUsername]);
    const userCount = parseInt(userResult[0].count);

    if (userCount === 0) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await query('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)', [adminUsername, hashedPassword, adminEmail, 'admin']);
      console.log(`✅ Default admin user created with admin role (username: ${adminUsername})`);
    } else {
      // Update existing admin user to have admin role if they don't have it
      await query('UPDATE users SET role = ? WHERE username = ? AND role != ?', ['admin', adminUsername, 'admin']);
      console.log('ℹ️ Default admin user already exists');
    }

    console.log('✅ MySQL database tables initialized');
  } catch (error) {
    console.error('❌ MySQL database initialization failed:', error);
  }
}
