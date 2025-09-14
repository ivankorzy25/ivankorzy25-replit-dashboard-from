import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles enum
export const UserRole = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Users table for admin authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default(UserRole.VIEWER).notNull(), // 'admin', 'editor', 'viewer'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table based on KOR requirements
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  modelo: text("modelo"),
  marca: text("marca"),
  familia: text("familia"),
  descripcion: text("descripcion"),
  caracteristicas: text("caracteristicas"),
  precioUsdSinIva: decimal("precio_usd_sin_iva", { precision: 10, scale: 2 }),
  precioUsdConIva: decimal("precio_usd_con_iva", { precision: 10, scale: 2 }),
  precioCompra: decimal("precio_compra", { precision: 10, scale: 2 }),
  ivaPercent: decimal("iva_percent", { precision: 5, scale: 2 }).default("21"),
  stock: text("stock").default("Sin Stock"), // Disponible, Sin Stock, Consultar
  combustible: text("combustible"), // Nafta, Diesel, Gas, Nafta/Gas
  potencia: text("potencia"),
  motor: text("motor"),
  cabina: text("cabina"),
  ttaIncluido: boolean("tta_incluido").default(false),
  
  // URLs for multimedia
  urlPdf: text("url_pdf"),
  instagramFeedUrl1: text("instagram_feed_url_1"),
  instagramFeedUrl2: text("instagram_feed_url_2"),
  instagramFeedUrl3: text("instagram_feed_url_3"),
  instagramStoryUrl1: text("instagram_story_url_1"),
  mercadoLibreUrl1: text("mercado_libre_url_1"),
  webGenericaUrl1: text("web_generica_url_1"),
  urlFichaHtml: text("url_ficha_html"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product families for organization
export const productFamilies = pgTable("product_families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// File uploads tracking
export const fileUploads = pgTable("file_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  gcsUrl: text("gcs_url").notNull(),
  productId: varchar("product_id").references(() => products.id),
  uploadType: text("upload_type"), // pdf, imagen_feed_1, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const bulkPriceUpdateSchema = z.object({
  percentage: z.number(),
  field: z.enum(["precioUsdSinIva", "precioUsdConIva", "precioCompra"]),
  familia: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  email: z.string().email("Email inválido").optional(),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type BulkPriceUpdate = z.infer<typeof bulkPriceUpdateSchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
