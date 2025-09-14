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
  // Helper method to map snake_case database fields to camelCase for frontend
  private mapProductFields(dbProduct: any): Product {
    return {
      id: dbProduct.id,
      sku: dbProduct.sku,
      modelo: dbProduct.modelo,
      marca: dbProduct.marca,
      familia: dbProduct.familia,
      descripcion: dbProduct.descripcion,
      caracteristicas: dbProduct.caracteristicas,
      precioUsdSinIva: dbProduct.precio_usd_sin_iva,
      precioUsdConIva: dbProduct.precio_usd_con_iva,
      precioCompra: dbProduct.precio_compra,
      ivaPercent: dbProduct.iva_percent,
      stock: dbProduct.stock,
      combustible: dbProduct.combustible,
      potencia: dbProduct.potencia,
      motor: dbProduct.motor,
      cabina: dbProduct.cabina,
      ttaIncluido: dbProduct.tta_incluido,
      urlPdf: dbProduct.url_pdf,
      instagramFeedUrl1: dbProduct.instagram_feed_url_1,
      instagramFeedUrl2: dbProduct.instagram_feed_url_2,
      instagramFeedUrl3: dbProduct.instagram_feed_url_3,
      instagramStoryUrl1: dbProduct.instagram_story_url_1,
      mercadoLibreUrl1: dbProduct.mercado_libre_url_1,
      webGenericaUrl1: dbProduct.web_generica_url_1,
      urlFichaHtml: dbProduct.url_ficha_html,
      createdAt: dbProduct.created_at,
      updatedAt: dbProduct.updated_at,
    };
  }
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
    
    // Get total count and products based on filters
    let countResult, products;
    
    if (filters.search && filters.familia) {
      const searchTerm = `%${filters.search}%`;
      countResult = await sql`SELECT COUNT(*) as total FROM products WHERE (sku ILIKE ${searchTerm} OR modelo ILIKE ${searchTerm} OR descripcion ILIKE ${searchTerm}) AND familia = ${filters.familia}`;
      products = await sql`SELECT * FROM products WHERE (sku ILIKE ${searchTerm} OR modelo ILIKE ${searchTerm} OR descripcion ILIKE ${searchTerm}) AND familia = ${filters.familia} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      countResult = await sql`SELECT COUNT(*) as total FROM products WHERE (sku ILIKE ${searchTerm} OR modelo ILIKE ${searchTerm} OR descripcion ILIKE ${searchTerm})`;
      products = await sql`SELECT * FROM products WHERE (sku ILIKE ${searchTerm} OR modelo ILIKE ${searchTerm} OR descripcion ILIKE ${searchTerm}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (filters.familia) {
      countResult = await sql`SELECT COUNT(*) as total FROM products WHERE familia = ${filters.familia}`;
      products = await sql`SELECT * FROM products WHERE familia = ${filters.familia} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countResult = await sql`SELECT COUNT(*) as total FROM products`;
      products = await sql`SELECT * FROM products ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }
    
    const total = parseInt(countResult[0].total);
    
    return {
      products: products.map(p => this.mapProductFields(p)),
      total
    };
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await sql`SELECT * FROM products WHERE id = ${id}`;
    return result[0] ? this.mapProductFields(result[0]) : undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const result = await sql`SELECT * FROM products WHERE sku = ${sku}`;
    return result[0] ? this.mapProductFields(result[0]) : undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await sql`
      INSERT INTO products (
        sku, modelo, marca, familia, precio_usd_sin_iva, iva_percent, precio_compra,
        descripcion, caracteristicas, potencia, motor, cabina, tta_incluido, stock,
        combustible, url_pdf, instagram_feed_url_1, instagram_feed_url_2, instagram_feed_url_3,
        instagram_story_url_1, mercado_libre_url_1, web_generica_url_1, url_ficha_html
      ) VALUES (
        ${product.sku}, ${product.modelo || null}, ${product.marca || null}, 
        ${product.familia || null}, ${product.precioUsdSinIva || null}, 
        ${product.ivaPercent || null}, ${product.precioCompra || null},
        ${product.descripcion || null}, ${product.caracteristicas || null}, 
        ${product.potencia || null}, ${product.motor || null}, 
        ${product.cabina || null}, ${product.ttaIncluido || false}, 
        ${product.stock || null}, ${product.combustible || null},
        ${product.urlPdf || null}, ${product.instagramFeedUrl1 || null}, 
        ${product.instagramFeedUrl2 || null}, ${product.instagramFeedUrl3 || null},
        ${product.instagramStoryUrl1 || null}, ${product.mercadoLibreUrl1 || null}, 
        ${product.webGenericaUrl1 || null}, ${product.urlFichaHtml || null}
      ) RETURNING *
    `;
    return this.mapProductFields(result[0]);
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    if (Object.keys(product).length === 0) {
      return this.getProduct(id);
    }

    // Build update query by checking each field individually
    // Only update fields that are provided in the product object
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (product.sku !== undefined) {
      updates.push(`sku = $${paramIndex++}`);
      values.push(product.sku);
    }
    if (product.modelo !== undefined) {
      updates.push(`modelo = $${paramIndex++}`);
      values.push(product.modelo);
    }
    if (product.marca !== undefined) {
      updates.push(`marca = $${paramIndex++}`);
      values.push(product.marca);
    }
    if (product.familia !== undefined) {
      updates.push(`familia = $${paramIndex++}`);
      values.push(product.familia);
    }
    if (product.precioUsdSinIva !== undefined) {
      updates.push(`precio_usd_sin_iva = $${paramIndex++}`);
      values.push(product.precioUsdSinIva);
    }
    if (product.ivaPercent !== undefined) {
      updates.push(`iva_percent = $${paramIndex++}`);
      values.push(product.ivaPercent);
    }
    if (product.precioCompra !== undefined) {
      updates.push(`precio_compra = $${paramIndex++}`);
      values.push(product.precioCompra);
    }
    if (product.descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(product.descripcion);
    }
    if (product.caracteristicas !== undefined) {
      updates.push(`caracteristicas = $${paramIndex++}`);
      values.push(product.caracteristicas);
    }
    if (product.potencia !== undefined) {
      updates.push(`potencia = $${paramIndex++}`);
      values.push(product.potencia);
    }
    if (product.motor !== undefined) {
      updates.push(`motor = $${paramIndex++}`);
      values.push(product.motor);
    }
    if (product.cabina !== undefined) {
      updates.push(`cabina = $${paramIndex++}`);
      values.push(product.cabina);
    }
    if (product.ttaIncluido !== undefined) {
      updates.push(`tta_incluido = $${paramIndex++}`);
      values.push(product.ttaIncluido);
    }
    if (product.stock !== undefined) {
      updates.push(`stock = $${paramIndex++}`);
      values.push(product.stock);
    }
    if (product.combustible !== undefined) {
      updates.push(`combustible = $${paramIndex++}`);
      values.push(product.combustible);
    }
    if (product.urlPdf !== undefined) {
      updates.push(`url_pdf = $${paramIndex++}`);
      values.push(product.urlPdf);
    }
    if (product.instagramFeedUrl1 !== undefined) {
      updates.push(`instagram_feed_url_1 = $${paramIndex++}`);
      values.push(product.instagramFeedUrl1);
    }
    if (product.instagramFeedUrl2 !== undefined) {
      updates.push(`instagram_feed_url_2 = $${paramIndex++}`);
      values.push(product.instagramFeedUrl2);
    }
    if (product.instagramFeedUrl3 !== undefined) {
      updates.push(`instagram_feed_url_3 = $${paramIndex++}`);
      values.push(product.instagramFeedUrl3);
    }
    if (product.instagramStoryUrl1 !== undefined) {
      updates.push(`instagram_story_url_1 = $${paramIndex++}`);
      values.push(product.instagramStoryUrl1);
    }
    if (product.mercadoLibreUrl1 !== undefined) {
      updates.push(`mercado_libre_url_1 = $${paramIndex++}`);
      values.push(product.mercadoLibreUrl1);
    }
    if (product.webGenericaUrl1 !== undefined) {
      updates.push(`web_generica_url_1 = $${paramIndex++}`);
      values.push(product.webGenericaUrl1);
    }
    if (product.urlFichaHtml !== undefined) {
      updates.push(`url_ficha_html = $${paramIndex++}`);
      values.push(product.urlFichaHtml);
    }

    // Add the ID and timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await sql(query, ...values);
    
    return this.getProduct(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM products WHERE id = ${id}`;
    return result.rowCount > 0;
  }

  async updatePricesBulk(percentage: number, field: string, familia?: string): Promise<number> {
    let result;
    if (familia) {
      if (field === 'precioUsdSinIva') {
        result = await sql`UPDATE products SET precio_usd_sin_iva = precio_usd_sin_iva * (1 + ${percentage}::decimal / 100) WHERE familia = ${familia} RETURNING id`;
      } else if (field === 'precioCompra') {
        result = await sql`UPDATE products SET precio_compra = precio_compra * (1 + ${percentage}::decimal / 100) WHERE familia = ${familia} RETURNING id`;
      } else {
        throw new Error(`Invalid field: ${field}`);
      }
    } else {
      if (field === 'precioUsdSinIva') {
        result = await sql`UPDATE products SET precio_usd_sin_iva = precio_usd_sin_iva * (1 + ${percentage}::decimal / 100) RETURNING id`;
      } else if (field === 'precioCompra') {
        result = await sql`UPDATE products SET precio_compra = precio_compra * (1 + ${percentage}::decimal / 100) RETURNING id`;
      } else {
        throw new Error(`Invalid field: ${field}`);
      }
    }
    
    const affectedRows = Array.isArray(result) ? result.length : 0;
    return affectedRows;
  }

  async createFileUpload(upload: InsertFileUpload): Promise<FileUpload> {
    const result = await sql`
      INSERT INTO file_uploads (
        filename, original_name, mime_type, size, gcs_url, product_id, upload_type
      ) VALUES (
        ${upload.filename}, ${upload.originalName}, ${upload.mimeType}, 
        ${upload.size}, ${upload.gcsUrl}, ${upload.productId || null}, 
        ${upload.uploadType || null}
      ) RETURNING *
    `;
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
    return (result as any[]).map(row => row.familia);
  }
}

export const storage = new PostgreSQLStorage();
