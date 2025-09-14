import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@shared/schema';
import { storage } from '../storage';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role?: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET environment variable is required');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, process.env.SESSION_SECRET, async (err: any, decodedUser: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Verificar si el usuario está activo en la base de datos
    try {
      const user = await storage.getUser(decodedUser.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Verificar si el usuario está desactivado
      if (!user.isActive) {
        return res.status(403).json({ error: 'Usuario desactivado' });
      }
      
      req.user = decodedUser;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Error de servidor' });
    }
  });
}

export function generateToken(user: { id: string; username: string; role?: string }): string {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.SESSION_SECRET,
    { expiresIn: '24h' }
  );
}

// Middleware to check if user has required role
export function requireRole(requiredRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get fresh user data with role from database
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Verificar si el usuario está desactivado
      if (!user.isActive) {
        return res.status(403).json({ error: 'Usuario desactivado' });
      }

      // Check if user has required role
      if (!requiredRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Update req.user with fresh role
      req.user.role = user.role;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Helper middleware shortcuts
export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireEditor = requireRole([UserRole.ADMIN, UserRole.EDITOR]);
export const requireViewer = requireRole([UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER]);
