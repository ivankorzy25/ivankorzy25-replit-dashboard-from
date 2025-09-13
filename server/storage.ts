import { type User, type InsertUser, type Product, type InsertProduct, type FileUpload, type InsertFileUpload } from "@shared/schema";
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Products
  getProducts(filters: {
    page?: number;
    limit?: number;
    search?: string;
    familia?: string;
  }): Promise<{ products: Product[]; total: number }>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Bulk operations
  updatePricesBulk(percentage: number, field: string, familia?: string): Promise<number>;
  
  // File uploads
  createFileUpload(upload: InsertFileUpload): Promise<FileUpload>;
  getFileUploadsByProduct(productId: string): Promise<FileUpload[]>;
  
  // Statistics
  getProductStats(): Promise<{
    totalProductos: number;
    totalFamilias: number;
    enStock: number;
    sinStock: number;
  }>;
  
  getFamilias(): Promise<string[]>;
}

export class PostgreSQLStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result[0] as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    return result[0] as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await sql`
      INSERT INTO users (username, password, email) 
      VALUES (${user.username}, ${user.password}, ${user.email || null}) 
      RETURNING *
    `;
    return result[0] as User;
  }

  async getProducts(filters: {
    page?: number;
    limit?: number;
    search?: string;
    familia?: string;
  } = {}): Promise<{ products: Product[]; total: number }> {
    const { page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    let conditions = [];
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(sql`(sku ILIKE ${searchTerm} OR modelo ILIKE ${searchTerm} OR descripcion ILIKE ${searchTerm})`);
    }
    if (filters.familia) {
      conditions.push(sql`familia = ${filters.familia}`);
    }
    
    // Get total count
    const countQuery = conditions.length > 0 
      ? sql`SELECT COUNT(*) as total FROM products WHERE ${sql.join(conditions, sql` AND `)}`
      : sql`SELECT COUNT(*) as total FROM products`;
    const countResult = await countQuery;
    const total = parseInt(countResult[0].total);
    
    // Get products with pagination
    const productQuery = conditions.length > 0
      ? sql`SELECT * FROM products WHERE ${sql.join(conditions, sql` AND `)} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      : sql`SELECT * FROM products ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const products = await productQuery;
    
    return {
      products: products as Product[],
      total
    };
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await sql`SELECT * FROM products WHERE id = ${id}`;
    return result[0] as Product | undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const result = await sql`SELECT * FROM products WHERE sku = ${sku}`;
    return result[0] as Product | undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const fields = Object.keys(product);
    const values = Object.values(product);
    
    // Build the INSERT query dynamically
    const fieldList = fields.join(', ');
    const valueList = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await sql.unsafe(
      `INSERT INTO products (${fieldList}) VALUES (${valueList}) RETURNING *`,
      values
    );
    return result[0] as Product;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const fields = Object.keys(product);
    const values = Object.values(product);
    
    if (fields.length === 0) {
      return this.getProduct(id);
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    await sql.unsafe(
      `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1}`,
      [...values, id]
    );
    
    return this.getProduct(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM products WHERE id = ${id}`;
    return result.count > 0;
  }

  async updatePricesBulk(percentage: number, field: string, familia?: string): Promise<number> {
    let result;
    if (familia) {
      result = await sql.unsafe(
        `UPDATE products SET ${field} = ${field} * (1 + $1 / 100) WHERE familia = $2`,
        [percentage, familia]
      );
    } else {
      result = await sql.unsafe(
        `UPDATE products SET ${field} = ${field} * (1 + $1 / 100)`,
        [percentage]
      );
    }
    return result.count || 0;
  }

  async createFileUpload(upload: InsertFileUpload): Promise<FileUpload> {
    const fields = Object.keys(upload);
    const values = Object.values(upload);
    
    const fieldList = fields.join(', ');
    const valueList = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await sql.unsafe(
      `INSERT INTO file_uploads (${fieldList}) VALUES (${valueList}) RETURNING *`,
      values
    );
    return result[0] as FileUpload;
  }

  async getFileUploadsByProduct(productId: string): Promise<FileUpload[]> {
    const result = await sql`SELECT * FROM file_uploads WHERE product_id = ${productId} ORDER BY created_at DESC`;
    return result as FileUpload[];
  }

  async getProductStats(): Promise<{
    totalProductos: number;
    totalFamilias: number;
    enStock: number;
    sinStock: number;
  }> {
    const totalResult = await sql`SELECT COUNT(*) as total FROM products`;
    const familiaResult = await sql`SELECT COUNT(DISTINCT familia) as total FROM products WHERE familia IS NOT NULL`;
    const stockResult = await sql`SELECT COUNT(*) as total FROM products WHERE stock = 'Disponible'`;
    
    const totalProductos = parseInt(totalResult[0].total);
    const enStock = parseInt(stockResult[0].total);
    
    return {
      totalProductos,
      totalFamilias: parseInt(familiaResult[0].total),
      enStock,
      sinStock: totalProductos - enStock
    };
  }

  async getFamilias(): Promise<string[]> {
    const result = await sql`SELECT DISTINCT familia FROM products WHERE familia IS NOT NULL ORDER BY familia`;
    return result.map(row => row.familia);
  }
}

export const storage = new PostgreSQLStorage();
