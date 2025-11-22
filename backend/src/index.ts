import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { registerRoutes } from './routes';
import { checkDatabaseConnection } from './db';

const app = express();

// Middleware
app.use(compression({ level: 6 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// Register routes
registerRoutes(app);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const startedAt = new Date().toISOString();
  const dbConnected = await checkDatabaseConnection();
  res.json({ 
    ok: true, 
    env: process.env.NODE_ENV || 'development',
    startedAt,
    dbConnected 
  });
});

// 404 handler for API routes
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const msg: string = String(err?.message || '');
  const looksLikeDbDown = /ECONNREFUSED|ENOTFOUND|timeout|terminat|TLS|connection/i.test(msg);
  const status = err.status || err.statusCode || (looksLikeDbDown ? 503 : 500);
  const message = err.message || (status === 503 ? 'Service Unavailable' : 'Internal Server Error');

  if (!res.headersSent) {
    res.status(status).json({ message });
  }
  
  if (status === 503) {
    console.warn('Handled 503 error:', err?.message);
    return;
  }
  
  console.error('Error:', err);
});

// Start server
const port = parseInt(process.env.PORT || '5000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

