import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export function authenticateToken(
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

  jwt.verify(token, process.env.SESSION_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function generateToken(user: { id: string; username: string }): string {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.SESSION_SECRET,
    { expiresIn: '24h' }
  );
}
