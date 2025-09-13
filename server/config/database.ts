import { neon } from '@neondatabase/serverless';

// Create SQL client with the DATABASE_URL
const sql = neon(process.env.DATABASE_URL!);

// Mock pool interface for compatibility with existing code
class MockPool {
  async connect() {
    return {
      query: sql,
      release: () => {}
    };
  }
}

export const pool = new MockPool();

export async function testConnection() {
  try {
    await sql('SELECT 1');
    console.log('✅ PostgreSQL database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL database connection failed:', error);
    return false;
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create products table
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        sku TEXT NOT NULL UNIQUE,
        modelo TEXT,
        marca TEXT,
        familia TEXT,
        descripcion TEXT,
        caracteristicas TEXT,
        precio_usd_sin_iva DECIMAL(10,2),
        precio_usd_con_iva DECIMAL(10,2),
        precio_compra DECIMAL(10,2),
        iva_percent DECIMAL(5,2) DEFAULT 21,
        stock TEXT DEFAULT 'Sin Stock',
        combustible TEXT,
        potencia TEXT,
        motor TEXT,
        cabina TEXT,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create file_uploads table
    await sql`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        gcs_url TEXT NOT NULL,
        product_id TEXT,
        upload_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `;

    // Create default admin user
    const userResult = await sql`SELECT COUNT(*) as count FROM users WHERE username = 'admin'`;
    const userCount = parseInt(userResult[0].count);
    
    if (userCount === 0) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await sql`INSERT INTO users (username, password, email) VALUES ('admin', ${hashedPassword}, 'admin@kor.com')`;
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('ℹ️ Default admin user already exists');
    }

    console.log('✅ PostgreSQL database tables initialized');
  } catch (error) {
    console.error('❌ PostgreSQL database initialization failed:', error);
  }
}
