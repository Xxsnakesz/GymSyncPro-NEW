import { Router, Request, Response } from 'express';
import { ActivityLogService } from '../services/activityLog';

const router = Router();

/**
 * Get activity logs for the current user
 */
router.get('/user', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 50, offset = 0 } = req.query;
    const logs = await ActivityLogService.getUserActivityLogs(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all activity logs (admin only)
 */
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      limit = 100,
      offset = 0,
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = req.query;

    const filters: any = {};
    if (action) filters.action = action as string;
    if (entity) filters.entity = entity as string;
    if (userId) filters.userId = userId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const logs = await ActivityLogService.getAllActivityLogs(
      parseInt(limit as string),
      parseInt(offset as string),
      filters
    );

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get activity statistics (admin only)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { startDate, endDate } = req.query;

    const stats = await ActivityLogService.getActivityStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
