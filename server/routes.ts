import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, generateToken, requireAdmin, requireEditor } from "./middleware/auth";
import { initializeDatabase, testConnection } from "./config/database";
import { uploadFile } from "./config/storage";
import { loginSchema, insertProductSchema, bulkPriceUpdateSchema, updateUserRoleSchema, createUserSchema, updateAlertConfigSchema, testAlertSchema } from "@shared/schema";
import bcrypt from 'bcrypt';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { join } from 'path';
import { alertEngine, manualStockCheck, manualDigest } from './services/alerts';
import { sendTestEmail } from './services/email';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'audio/mp3'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await testConnection();
  await initializeDatabase();
  
  // Initialize alert engine
  await alertEngine.initialize();
  console.log('✅ Motor de alertas inicializado');

  // Serve uploaded files statically in development mode
  if (process.env.NODE_ENV === 'development' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const uploadsPath = join(process.cwd(), 'uploads');
    app.use('/uploads', express.static(uploadsPath));
  }

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verificar si el usuario está activo
      if (!user.isActive) {
        return res.status(403).json({ error: 'Usuario desactivado' });
      }
      
      const token = generateToken({ id: user.id, username: user.username, role: user.role });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User management routes (admin only)
  app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { role } = updateUserRoleSchema.parse(req.body);
      
      // Prevent users from changing their own role
      if (req.user.id === req.params.id) {
        return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
      }
      
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: 'El nombre de usuario ya existe' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const newUser = await storage.createUser({
        username: userData.username,
        password: hashedPassword,
        email: userData.email,
        ...(userData.role && { role: userData.role }),
      } as any);
      
      const { password, ...sanitizedUser } = newUser;
      res.status(201).json(sanitizedUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      // Prevent users from deleting themselves
      if (req.user.id === req.params.id) {
        return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' });
      }
      
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id/status', authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'El campo isActive debe ser booleano' });
      }
      
      // Prevent users from deactivating themselves
      if (req.user.id === req.params.id && !isActive) {
        return res.status(403).json({ error: 'No puedes desactivar tu propia cuenta' });
      }
      
      const updatedUser = await storage.updateUserStatus(req.params.id, isActive);
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Product routes
  app.get('/api/products', authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string || '';
      const familia = req.query.familia as string || '';
      
      const result = await storage.getProducts({ page, limit, search, familia });
      
      res.json({
        products: result.products,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products/:id', authenticateToken, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', authenticateToken, requireEditor, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/products/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk price update
  app.post('/api/products/bulk-price-update', authenticateToken, requireEditor, async (req, res) => {
    try {
      const { percentage, field, familia } = bulkPriceUpdateSchema.parse(req.body);
      const affectedRows = await storage.updatePricesBulk(percentage, field, familia);
      res.json({ 
        message: `Updated ${affectedRows} products successfully`,
        affectedRows 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk import products
  app.post('/api/products/bulk-import', authenticateToken, requireEditor, async (req, res) => {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: 'Products debe ser un array' });
      }

      if (products.length > 1000) {
        return res.status(400).json({ error: 'No se pueden importar más de 1000 productos a la vez' });
      }

      // Validate each product
      const validProducts: any[] = [];
      const validationErrors: Array<{ row: number; errors: string[] }> = [];

      products.forEach((product, index) => {
        try {
          // Parse and validate product data
          const parsedProduct = insertProductSchema.parse(product);
          validProducts.push(parsedProduct);
        } catch (error: any) {
          const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [error.message];
          validationErrors.push({ row: index + 1, errors });
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Errores de validación en algunos productos',
          validationErrors
        });
      }

      // Perform upsert
      const result = await storage.upsertProducts(validProducts);
      
      res.json({
        message: `Importación completada: ${result.created} creados, ${result.updated} actualizados`,
        ...result
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all product SKUs (for validation)
  app.get('/api/products/skus', authenticateToken, async (req, res) => {
    try {
      const allProducts = await storage.getProducts({ limit: 10000 });
      const skus = allProducts.products.map(p => p.sku);
      res.json(skus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export products
  app.get('/api/products/export', authenticateToken, async (req, res) => {
    try {
      const familia = req.query.familia as string || '';
      const stock = req.query.stock as string || '';
      
      let filters: any = { limit: 10000 };
      if (familia) filters.familia = familia;
      
      const result = await storage.getProducts(filters);
      
      // Filter by stock if specified
      let products = result.products;
      if (stock) {
        products = products.filter(p => p.stock === stock);
      }
      
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File upload
  app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { productId, uploadType } = req.body;
      const timestamp = Date.now();
      const filename = `${timestamp}-${uuidv4()}-${req.file.originalname}`;
      const destination = productId 
        ? `products/${productId}/${uploadType || 'general'}/${filename}`
        : `uploads/${uploadType || 'general'}/${filename}`;

      const gcsUrl = await uploadFile(req.file, destination);

      const fileUpload = await storage.createFileUpload({
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        gcsUrl,
        productId: productId || undefined,
        uploadType: uploadType || undefined,
      });

      // Update product with URL if applicable
      if (productId && uploadType) {
        const urlMapping: Record<string, string> = {
          'pdf': 'urlPdf',
          'imagen_feed_1': 'instagramFeedUrl1',
          'imagen_feed_2': 'instagramFeedUrl2',
          'imagen_feed_3': 'instagramFeedUrl3',
          'imagen_story_1': 'instagramStoryUrl1',
          'imagen_ml_1': 'mercadoLibreUrl1',
          'imagen_web_1': 'webGenericaUrl1',
          'ficha_html': 'urlFichaHtml',
        };

        if (urlMapping[uploadType]) {
          await storage.updateProductUrlField(productId, urlMapping[uploadType], gcsUrl);
        }
      }

      res.json({
        success: true,
        url: gcsUrl,
        filename,
        upload: fileUpload,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Statistics
  app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getProductStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Families
  app.get('/api/families', authenticateToken, async (req, res) => {
    try {
      const families = await storage.getFamilias();
      res.json(families);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Alert configuration routes (admin only)
  app.get('/api/alerts/config', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const config = await storage.getAlertConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/alerts/config', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const updateData = updateAlertConfigSchema.parse(req.body);
      
      const updatedConfig = await storage.updateAlertConfig(updateData);
      
      // Reconfigure alert engine with new settings
      await alertEngine.reconfigure();
      
      res.json(updatedConfig);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get alert notifications history
  app.get('/api/alerts/notifications', authenticateToken, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getAlertNotifications(limit);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get low stock products
  app.get('/api/products/low-stock', authenticateToken, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || undefined;
      const products = await storage.getLowStockProducts(threshold);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send test alert email
  app.post('/api/alerts/test', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { type, email } = testAlertSchema.parse(req.body);
      
      const config = await storage.getAlertConfig();
      if (!config) {
        return res.status(500).json({ error: 'Configuración de alertas no encontrada' });
      }
      
      const success = await sendTestEmail(email, type, config.fromEmail);
      
      if (success) {
        res.json({ message: 'Email de prueba enviado exitosamente' });
      } else {
        res.status(500).json({ error: 'Error al enviar email de prueba' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Manual trigger for stock check (admin only)
  app.post('/api/alerts/check-stock', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const force = req.body.force === true;
      await manualStockCheck(force);
      res.json({ message: 'Verificación de stock ejecutada' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual trigger for digest (admin only)
  app.post('/api/alerts/send-digest', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { frequency } = req.body;
      if (!frequency || !['daily', 'weekly'].includes(frequency)) {
        return res.status(400).json({ error: 'Frecuencia inválida. Debe ser "daily" o "weekly"' });
      }
      
      await manualDigest(frequency);
      res.json({ message: `Resumen ${frequency === 'daily' ? 'diario' : 'semanal'} enviado` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports endpoints
  app.get('/api/reports/inventory-summary', authenticateToken, async (req, res) => {
    try {
      const summary = await storage.getInventorySummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/price-trends', authenticateToken, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trends = await storage.getPriceTrends(days);
      res.json(trends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/reports/family-distribution', authenticateToken, async (req, res) => {
    try {
      const distribution = await storage.getFamilyDistribution();
      res.json(distribution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
