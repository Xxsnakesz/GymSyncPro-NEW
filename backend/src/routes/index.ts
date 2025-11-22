import type { Express } from 'express';
import { setupAuth, isAuthenticated, isAdmin } from '../middlewares/auth';
import activityLogRoutes from './activityLogs';

// This will be expanded with actual route handlers
// For now, setting up the basic structure
export function registerRoutes(app: Express) {
  // Setup authentication middleware
  setupAuth(app);

  // API routes
  app.use('/api/activity-logs', isAuthenticated, activityLogRoutes);
  
  // Placeholder route
  app.get('/api/test', (_req, res) => {
    res.json({ message: 'Backend API is working!' });
  });
}

