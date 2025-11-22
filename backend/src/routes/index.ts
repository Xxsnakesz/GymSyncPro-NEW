import type { Express } from 'express';
import { setupAuth, isAuthenticated, isAdmin } from '../middlewares/auth';

// This will be expanded with actual route handlers
// For now, setting up the basic structure
export function registerRoutes(app: Express) {
  // Setup authentication middleware
  setupAuth(app);

  // API routes will be added here
  // Example: app.use('/api/users', userRoutes);
  // Example: app.use('/api/memberships', membershipRoutes);
  
  // Placeholder route
  app.get('/api/test', (_req, res) => {
    res.json({ message: 'Backend API is working!' });
  });
}

