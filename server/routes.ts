import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, generateToken } from "./middleware/auth";
import { initializeDatabase, testConnection } from "./config/database";
import { uploadFile } from "./config/storage";
import { loginSchema, insertProductSchema, bulkPriceUpdateSchema } from "@shared/schema";
import bcrypt from 'bcrypt';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { join } from 'path';

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
      
      const token = generateToken({ id: user.id, username: user.username });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
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
      });
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

  app.post('/api/products', authenticateToken, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', authenticateToken, async (req, res) => {
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

  app.delete('/api/products/:id', authenticateToken, async (req, res) => {
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
  app.post('/api/products/bulk-price-update', authenticateToken, async (req, res) => {
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
