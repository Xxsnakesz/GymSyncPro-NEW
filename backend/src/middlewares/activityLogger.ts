import { Request, Response, NextFunction } from 'express';
import { ActivityLogService } from '../services/activityLog';

/**
 * Middleware to automatically log API requests
 */
export function activityLogger(action: string, entity: string, getEntityId?: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    // Override res.send to capture successful responses
    res.send = function (body: any) {
      // Only log on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;
        const entityId = getEntityId ? getEntityId(req) : undefined;
        const method = req.method;
        const path = req.path;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Log the activity asynchronously
        ActivityLogService.log({
          userId: user?.id,
          action,
          entity,
          entityId,
          description: `${method} ${path}`,
          metadata: {
            method,
            path,
            statusCode: res.statusCode,
            body: method !== 'GET' ? req.body : undefined,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
          },
          ipAddress,
          userAgent,
        }).catch(error => {
          console.error('Activity logging error:', error);
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Middleware to log authentication events
 */
export function logAuthEvent(event: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT') {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (body: any) {
      const statusCode = res.statusCode;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const user = (req as any).user;

      let shouldLog = false;
      let action = event;
      let description = '';

      switch (event) {
        case 'LOGIN_ATTEMPT':
          shouldLog = true;
          description = 'User login attempt';
          break;
        case 'LOGIN_SUCCESS':
          shouldLog = statusCode >= 200 && statusCode < 300;
          description = 'User logged in successfully';
          break;
        case 'LOGIN_FAILED':
          shouldLog = statusCode >= 400;
          description = 'User login failed';
          break;
        case 'LOGOUT':
          shouldLog = statusCode >= 200 && statusCode < 300;
          description = 'User logged out';
          break;
      }

      if (shouldLog) {
        ActivityLogService.log({
          userId: user?.id || req.body?.username || req.body?.email,
          action,
          entity: 'auth',
          description,
          metadata: {
            statusCode,
            username: req.body?.username,
            email: req.body?.email,
          },
          ipAddress,
          userAgent,
        }).catch(error => {
          console.error('Auth activity logging error:', error);
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Helper function to extract entity ID from request params
 */
export const getIdFromParams = (paramName: string = 'id') => 
  (req: Request): string | undefined => req.params[paramName];

/**
 * Helper function to extract user ID from request body
 */
export const getUserIdFromBody = (req: Request): string | undefined => 
  req.body?.userId || (req as any).user?.id;

/**
 * Common activity loggers for different entities
 */
export const activityLoggers = {
  checkIn: activityLogger('CHECK_IN_API', 'checkin', getIdFromParams()),
  checkOut: activityLogger('CHECK_OUT_API', 'checkin', getIdFromParams()),
  classBooking: activityLogger('CLASS_BOOKING_API', 'class_booking', getIdFromParams()),
  membership: activityLogger('MEMBERSHIP_API', 'membership', getIdFromParams()),
  payment: activityLogger('PAYMENT_API', 'payment', getIdFromParams()),
  profile: activityLogger('PROFILE_API', 'user', (req) => (req as any).user?.id),
  admin: activityLogger('ADMIN_API', 'admin_action', getIdFromParams()),
};
