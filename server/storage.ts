import { type User, type InsertUser, type Product, type InsertProduct, type FileUpload, type InsertFileUpload, type AlertConfig, type InsertAlertConfig, type AlertNotification, type InsertAlertNotification } from "@shared/schema";
import { sql } from './config/database';

interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserStatus(id: string, isActive: boolean): Promise<User | undefined>;
  
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
  updateProductUrlField(id: string, fieldKey: string, url: string): Promise<Product | undefined>;
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
  
  // Advanced reports
  getInventorySummary(): Promise<{
    totalValue: number;
    valueByFamily: Array<{ family: string; value: number; count: number }>;
    stockDistribution: Array<{ status: string; count: number; percentage: number }>;
  }>;
  
  getPriceTrends(days?: number): Promise<Array<{
    date: string;
    family: string;
    avgPrice: number;
    productCount: number;
  }>>;
  
  getFamilyDistribution(): Promise<Array<{
    family: string;
    productCount: number;
    avgPrice: number;
    totalValue: number;
    inStock: number;
    outOfStock: number;
  }>>;
  
  // Alert management
  getAlertConfig(): Promise<AlertConfig | undefined>;
  updateAlertConfig(config: Partial<AlertConfig>): Promise<AlertConfig | undefined>;
  createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification>;
  getAlertNotifications(limit?: number): Promise<AlertNotification[]>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;
  updateProductNotificationTime(productId: string): Promise<void>;
}

export class PostgreSQLStorage implements IStorage {
  // Helper method to map snake_case database fields to camelCase for User
  private mapUserFields(dbUser: any): User {
    return {
      id: dbUser.id,
      username: dbUser.username,
      password: dbUser.password,
      email: dbUser.email,
      role: dbUser.role,
      isActive: dbUser.is_active,
      createdAt: dbUser.created_at
    } as User;
  }
  
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
      stockCantidad: dbProduct.stock_cantidad,
      lowStockThreshold: dbProduct.low_stock_threshold,
      lowStockNotifiedAt: dbProduct.low_stock_notified_at,
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
    return result[0] ? this.mapUserFields(result[0]) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    return result[0] ? this.mapUserFields(result[0]) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await sql`
      INSERT INTO users (username, password, email, role) 
      VALUES (${user.username}, ${user.password}, ${user.email || null}, ${(user as any).role || 'viewer'}) 
      RETURNING *
    `;
    return this.mapUserFields(result[0]);
  }

  async getAllUsers(): Promise<User[]> {
    const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    return result.map(user => this.mapUserFields(user));
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const result = await sql`
      UPDATE users 
      SET role = ${role} 
      WHERE id = ${id} 
      RETURNING *
    `;
    return result[0] ? this.mapUserFields(result[0]) : undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM users WHERE id = ${id}`;
    return result.count > 0;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const result = await sql`
      UPDATE users 
      SET is_active = ${isActive} 
      WHERE id = ${id} 
      RETURNING *
    `;
    return result[0] ? this.mapUserFields(result[0]) : undefined;
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


    // Fetch current product to merge with updates
    const current = await sql`SELECT * FROM products WHERE id = ${id}`;
    if (current.length === 0) return undefined;
    
    const currentProduct = current[0];
    
    // Merge current values with updates, using only the fields that were provided
    const mergedUpdates: any = {};
    
    if (product.sku !== undefined) mergedUpdates.sku = product.sku;
    if (product.modelo !== undefined) mergedUpdates.modelo = product.modelo;
    if (product.marca !== undefined) mergedUpdates.marca = product.marca;
    if (product.familia !== undefined) mergedUpdates.familia = product.familia;
    if (product.precioUsdSinIva !== undefined) mergedUpdates.precio_usd_sin_iva = product.precioUsdSinIva;
    if (product.ivaPercent !== undefined) mergedUpdates.iva_percent = product.ivaPercent;
    if (product.precioCompra !== undefined) mergedUpdates.precio_compra = product.precioCompra;
    if (product.descripcion !== undefined) mergedUpdates.descripcion = product.descripcion;
    if (product.caracteristicas !== undefined) mergedUpdates.caracteristicas = product.caracteristicas;
    if (product.potencia !== undefined) mergedUpdates.potencia = product.potencia;
    if (product.motor !== undefined) mergedUpdates.motor = product.motor;
    if (product.cabina !== undefined) mergedUpdates.cabina = product.cabina;
    if (product.ttaIncluido !== undefined) mergedUpdates.tta_incluido = product.ttaIncluido;
    if (product.stock !== undefined) mergedUpdates.stock = product.stock;
    if (product.combustible !== undefined) mergedUpdates.combustible = product.combustible;
    if (product.urlPdf !== undefined) mergedUpdates.url_pdf = product.urlPdf;
    if (product.instagramFeedUrl1 !== undefined) mergedUpdates.instagram_feed_url_1 = product.instagramFeedUrl1;
    if (product.instagramFeedUrl2 !== undefined) mergedUpdates.instagram_feed_url_2 = product.instagramFeedUrl2;
    if (product.instagramFeedUrl3 !== undefined) mergedUpdates.instagram_feed_url_3 = product.instagramFeedUrl3;
    if (product.instagramStoryUrl1 !== undefined) mergedUpdates.instagram_story_url_1 = product.instagramStoryUrl1;
    if (product.mercadoLibreUrl1 !== undefined) mergedUpdates.mercado_libre_url_1 = product.mercadoLibreUrl1;
    if (product.webGenericaUrl1 !== undefined) mergedUpdates.web_generica_url_1 = product.webGenericaUrl1;
    if (product.urlFichaHtml !== undefined) mergedUpdates.url_ficha_html = product.urlFichaHtml;

    // Build final values with fallbacks to current values
    const finalValues = {
      sku: mergedUpdates.sku ?? currentProduct.sku,
      modelo: mergedUpdates.modelo ?? currentProduct.modelo,
      marca: mergedUpdates.marca ?? currentProduct.marca,
      familia: mergedUpdates.familia ?? currentProduct.familia,
      precio_usd_sin_iva: mergedUpdates.precio_usd_sin_iva ?? currentProduct.precio_usd_sin_iva,
      iva_percent: mergedUpdates.iva_percent ?? currentProduct.iva_percent,
      precio_compra: mergedUpdates.precio_compra ?? currentProduct.precio_compra,
      descripcion: mergedUpdates.descripcion ?? currentProduct.descripcion,
      caracteristicas: mergedUpdates.caracteristicas ?? currentProduct.caracteristicas,
      potencia: mergedUpdates.potencia ?? currentProduct.potencia,
      motor: mergedUpdates.motor ?? currentProduct.motor,
      cabina: mergedUpdates.cabina ?? currentProduct.cabina,
      tta_incluido: mergedUpdates.tta_incluido ?? currentProduct.tta_incluido,
      stock: mergedUpdates.stock ?? currentProduct.stock,
      combustible: mergedUpdates.combustible ?? currentProduct.combustible,
      url_pdf: mergedUpdates.url_pdf ?? currentProduct.url_pdf,
      instagram_feed_url_1: mergedUpdates.instagram_feed_url_1 ?? currentProduct.instagram_feed_url_1,
      instagram_feed_url_2: mergedUpdates.instagram_feed_url_2 ?? currentProduct.instagram_feed_url_2,
      instagram_feed_url_3: mergedUpdates.instagram_feed_url_3 ?? currentProduct.instagram_feed_url_3,
      instagram_story_url_1: mergedUpdates.instagram_story_url_1 ?? currentProduct.instagram_story_url_1,
      mercado_libre_url_1: mergedUpdates.mercado_libre_url_1 ?? currentProduct.mercado_libre_url_1,
      web_generica_url_1: mergedUpdates.web_generica_url_1 ?? currentProduct.web_generica_url_1,
      url_ficha_html: mergedUpdates.url_ficha_html ?? currentProduct.url_ficha_html,
    };

    // Execute static UPDATE with all fields using tagged template
    const result = await sql`
      UPDATE products SET 
        sku = ${finalValues.sku},
        modelo = ${finalValues.modelo},
        marca = ${finalValues.marca},
        familia = ${finalValues.familia},
        precio_usd_sin_iva = ${finalValues.precio_usd_sin_iva},
        iva_percent = ${finalValues.iva_percent},
        precio_compra = ${finalValues.precio_compra},
        descripcion = ${finalValues.descripcion},
        caracteristicas = ${finalValues.caracteristicas},
        potencia = ${finalValues.potencia},
        motor = ${finalValues.motor},
        cabina = ${finalValues.cabina},
        tta_incluido = ${finalValues.tta_incluido},
        stock = ${finalValues.stock},
        combustible = ${finalValues.combustible},
        url_pdf = ${finalValues.url_pdf},
        instagram_feed_url_1 = ${finalValues.instagram_feed_url_1},
        instagram_feed_url_2 = ${finalValues.instagram_feed_url_2},
        instagram_feed_url_3 = ${finalValues.instagram_feed_url_3},
        instagram_story_url_1 = ${finalValues.instagram_story_url_1},
        mercado_libre_url_1 = ${finalValues.mercado_libre_url_1},
        web_generica_url_1 = ${finalValues.web_generica_url_1},
        url_ficha_html = ${finalValues.url_ficha_html},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0] ? this.mapProductFields(result[0]) : undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
    return result.length > 0;
  }

  async updateProductUrlField(id: string, fieldKey: string, url: string): Promise<Product | undefined> {
    // Use static tagged-template queries for URL fields to avoid sql.unsafe issues
    switch (fieldKey) {
      case 'urlPdf':
        await sql`UPDATE products SET url_pdf = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'instagramFeedUrl1':
        await sql`UPDATE products SET instagram_feed_url_1 = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'instagramFeedUrl2':
        await sql`UPDATE products SET instagram_feed_url_2 = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'instagramFeedUrl3':
        await sql`UPDATE products SET instagram_feed_url_3 = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'instagramStoryUrl1':
        await sql`UPDATE products SET instagram_story_url_1 = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'mercadoLibreUrl1':
        await sql`UPDATE products SET mercado_libre_url_1 = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'webGenericaUrl1':
        await sql`UPDATE products SET web_generica_url_1 = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      case 'urlFichaHtml':
        await sql`UPDATE products SET url_ficha_html = ${url}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
        break;
      default:
        throw new Error(`Invalid URL field: ${fieldKey}`);
    }
    
    return this.getProduct(id);
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

  async getInventorySummary(): Promise<{
    totalValue: number;
    valueByFamily: Array<{ family: string; value: number; count: number }>;
    stockDistribution: Array<{ status: string; count: number; percentage: number }>;
  }> {
    // Get total inventory value
    const totalValueResult = await sql`
      SELECT SUM(COALESCE(precio_usd_sin_iva, 0)::decimal) as total 
      FROM products 
      WHERE precio_usd_sin_iva IS NOT NULL
    `;
    const totalValue = parseFloat(totalValueResult[0]?.total || '0');

    // Get value by family
    const valueByFamilyResult = await sql`
      SELECT 
        familia as family,
        COUNT(*) as count,
        SUM(COALESCE(precio_usd_sin_iva, 0)::decimal) as value
      FROM products
      WHERE familia IS NOT NULL
      GROUP BY familia
      ORDER BY value DESC
    `;
    const valueByFamily = valueByFamilyResult.map((row: any) => ({
      family: row.family,
      value: parseFloat(row.value || '0'),
      count: parseInt(row.count)
    }));

    // Get stock distribution
    const stockDistResult = await sql`
      SELECT stock as status, COUNT(*) as count
      FROM products
      GROUP BY stock
      ORDER BY count DESC
    `;
    const totalProducts = stockDistResult.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);
    const stockDistribution = stockDistResult.map((row: any) => ({
      status: row.status || 'Sin Stock',
      count: parseInt(row.count),
      percentage: totalProducts > 0 ? Math.round((parseInt(row.count) / totalProducts) * 100) : 0
    }));

    return {
      totalValue,
      valueByFamily,
      stockDistribution
    };
  }

  async getPriceTrends(days: number = 30): Promise<Array<{
    date: string;
    family: string;
    avgPrice: number;
    productCount: number;
  }>> {
    // Validate days parameter
    if (days < 1 || days > 365) {
      throw new Error('Days parameter must be between 1 and 365');
    }
    
    // Since we don't have historical data, we'll simulate trends based on current data
    const result = await sql`
      SELECT 
        familia as family,
        AVG(COALESCE(precio_usd_sin_iva, 0)::decimal) as avg_price,
        COUNT(*) as product_count
      FROM products
      WHERE familia IS NOT NULL AND precio_usd_sin_iva IS NOT NULL
      GROUP BY familia
      ORDER BY familia
    `;

    // Generate date series for the last N days
    const trends: Array<{ date: string; family: string; avgPrice: number; productCount: number }> = [];
    const today = new Date();
    
    // Calculate step with minimum of 1 to avoid infinite loop
    const step = Math.max(1, Math.floor(days / 7));
    
    for (const row of result) {
      // Create trend data points for each family
      for (let i = days - 1; i >= 0; i -= step) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Use deterministic variation based on family name and day index
        // This ensures consistent results for the same inputs
        const seed = row.family.charCodeAt(0) + i;
        const variation = 1 + ((seed % 10) - 5) * 0.01; // +/-5% variation deterministic
        
        trends.push({
          date: date.toISOString().split('T')[0],
          family: row.family,
          avgPrice: parseFloat((parseFloat(row.avg_price) * variation).toFixed(2)),
          productCount: parseInt(row.product_count)
        });
      }
    }

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getFamilyDistribution(): Promise<Array<{
    family: string;
    productCount: number;
    avgPrice: number;
    totalValue: number;
    inStock: number;
    outOfStock: number;
  }>> {
    const result = await sql`
      SELECT 
        familia as family,
        COUNT(*) as product_count,
        AVG(COALESCE(precio_usd_sin_iva, 0)::decimal) as avg_price,
        SUM(COALESCE(precio_usd_sin_iva, 0)::decimal) as total_value,
        SUM(CASE WHEN stock = 'Disponible' THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN stock != 'Disponible' OR stock IS NULL THEN 1 ELSE 0 END) as out_of_stock
      FROM products
      WHERE familia IS NOT NULL
      GROUP BY familia
      ORDER BY total_value DESC
    `;

    return result.map((row: any) => ({
      family: row.family,
      productCount: parseInt(row.product_count),
      avgPrice: parseFloat(row.avg_price || '0'),
      totalValue: parseFloat(row.total_value || '0'),
      inStock: parseInt(row.in_stock),
      outOfStock: parseInt(row.out_of_stock)
    }));
  }

  // Alert configuration methods
  async getAlertConfig(): Promise<AlertConfig | undefined> {
    const result = await sql`SELECT * FROM alert_config WHERE id = 1`;
    if (!result[0]) {
      // Create default config if not exists
      const defaultConfig = await sql`
        INSERT INTO alert_config (id, default_threshold, summary_frequency, is_enabled) 
        VALUES (1, 10, 'daily', true)
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;
      return defaultConfig[0] as AlertConfig;
    }
    return result[0] as AlertConfig;
  }

  async updateAlertConfig(config: Partial<AlertConfig>): Promise<AlertConfig | undefined> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query
    if (config.defaultThreshold !== undefined) {
      updates.push(`default_threshold = $${paramCount}`);
      values.push(config.defaultThreshold);
      paramCount++;
    }
    
    if (config.summaryFrequency !== undefined) {
      updates.push(`summary_frequency = $${paramCount}`);
      values.push(config.summaryFrequency);
      paramCount++;
    }
    
    if (config.recipients !== undefined) {
      updates.push(`recipients = $${paramCount}`);
      values.push(config.recipients);
      paramCount++;
    }
    
    if (config.isEnabled !== undefined) {
      updates.push(`is_enabled = $${paramCount}`);
      values.push(config.isEnabled);
      paramCount++;
    }
    
    if (config.fromEmail !== undefined) {
      updates.push(`from_email = $${paramCount}`);
      values.push(config.fromEmail);
      paramCount++;
    }

    if (config.lastDailyDigestAt !== undefined) {
      updates.push(`last_daily_digest_at = $${paramCount}`);
      values.push(config.lastDailyDigestAt);
      paramCount++;
    }

    if (config.lastWeeklyDigestAt !== undefined) {
      updates.push(`last_weekly_digest_at = $${paramCount}`);
      values.push(config.lastWeeklyDigestAt);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.getAlertConfig();
    }

    updates.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE alert_config 
      SET ${updates.join(', ')}
      WHERE id = 1
      RETURNING *
    `;

    const result = await sql.unsafe(query, values);
    return result[0] as AlertConfig;
  }

  async createAlertNotification(notification: InsertAlertNotification): Promise<AlertNotification> {
    const result = await sql`
      INSERT INTO alert_notifications (
        product_id, type, recipients, subject, body, status, error
      ) VALUES (
        ${notification.productId || null},
        ${notification.type},
        ${notification.recipients || []},
        ${notification.subject},
        ${notification.body},
        ${notification.status || 'pending'},
        ${notification.error || null}
      )
      RETURNING *
    `;
    return result[0] as AlertNotification;
  }

  async getAlertNotifications(limit: number = 50): Promise<AlertNotification[]> {
    const result = await sql`
      SELECT * FROM alert_notifications 
      ORDER BY sent_at DESC 
      LIMIT ${limit}
    `;
    return result as AlertNotification[];
  }

  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    const defaultThreshold = threshold || 10;
    
    const result = await sql`
      SELECT * FROM products 
      WHERE 
        (stock_cantidad < COALESCE(low_stock_threshold, ${defaultThreshold}))
        OR (stock = 'Sin Stock' OR stock = 'Consultar')
      ORDER BY stock_cantidad ASC, sku ASC
    `;
    
    return result.map(p => this.mapProductFields(p));
  }

  async updateProductNotificationTime(productId: string): Promise<void> {
    await sql`
      UPDATE products 
      SET low_stock_notified_at = NOW() 
      WHERE id = ${productId}
    `;
  }
}

export const storage = new PostgreSQLStorage();
