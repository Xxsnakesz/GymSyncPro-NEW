import { db } from '../db';

export interface ActivityLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogService {
  /**
   * Log an activity to the database
   */
  static async log(data: ActivityLogData): Promise<void> {
    try {
      await db.activityLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          description: data.description,
          metadata: data.metadata || undefined,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to prevent breaking the main functionality
    }
  }

  /**
   * Log user login activity
   */
  static async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'LOGIN',
      entity: 'user',
      entityId: userId,
      description: 'User logged in successfully',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user logout activity
   */
  static async logLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'LOGOUT',
      entity: 'user',
      entityId: userId,
      description: 'User logged out',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log check-in activity
   */
  static async logCheckIn(userId: string, checkInId: string, lockerNumber?: string): Promise<void> {
    await this.log({
      userId,
      action: 'CHECK_IN',
      entity: 'checkin',
      entityId: checkInId,
      description: `User checked in${lockerNumber ? ` with locker ${lockerNumber}` : ''}`,
      metadata: { lockerNumber },
    });
  }

  /**
   * Log check-out activity
   */
  static async logCheckOut(userId: string, checkInId: string): Promise<void> {
    await this.log({
      userId,
      action: 'CHECK_OUT',
      entity: 'checkin',
      entityId: checkInId,
      description: 'User checked out',
    });
  }

  /**
   * Log class booking activity
   */
  static async logClassBooking(userId: string, bookingId: string, className: string, action: 'BOOK' | 'CANCEL'): Promise<void> {
    await this.log({
      userId,
      action: action === 'BOOK' ? 'CLASS_BOOKED' : 'CLASS_CANCELLED',
      entity: 'class_booking',
      entityId: bookingId,
      description: action === 'BOOK' 
        ? `User booked class: ${className}`
        : `User cancelled class booking: ${className}`,
      metadata: { className },
    });
  }

  /**
   * Log membership changes
   */
  static async logMembershipChange(userId: string, membershipId: string, action: 'CREATED' | 'RENEWED' | 'CANCELLED', planName?: string): Promise<void> {
    const descriptions = {
      CREATED: `New membership created${planName ? `: ${planName}` : ''}`,
      RENEWED: `Membership renewed${planName ? `: ${planName}` : ''}`,
      CANCELLED: `Membership cancelled${planName ? `: ${planName}` : ''}`,
    };

    await this.log({
      userId,
      action: `MEMBERSHIP_${action}`,
      entity: 'membership',
      entityId: membershipId,
      description: descriptions[action],
      metadata: { planName },
    });
  }

  /**
   * Log payment activities
   */
  static async logPayment(userId: string, paymentId: string, amount: number, status: 'SUCCESS' | 'FAILED'): Promise<void> {
    await this.log({
      userId,
      action: status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      entity: 'payment',
      entityId: paymentId,
      description: `Payment ${status.toLowerCase()}: $${amount}`,
      metadata: { amount, status },
    });
  }

  /**
   * Log admin actions
   */
  static async logAdminAction(adminId: string, action: string, entity: string, entityId: string, description: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      userId: adminId,
      action: `ADMIN_${action.toUpperCase()}`,
      entity,
      entityId,
      description: `Admin action: ${description}`,
      metadata,
    });
  }

  /**
   * Get activity logs for a user
   */
  static async getUserActivityLogs(userId: string, limit: number = 50, offset: number = 0) {
    return await db.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get all activity logs (for admin)
   */
  static async getAllActivityLogs(limit: number = 100, offset: number = 0, filters?: {
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters) {
      if (filters.action) where.action = filters.action;
      if (filters.entity) where.entity = filters.entity;
      if (filters.userId) where.userId = filters.userId;
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }
    }

    return await db.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [
      totalActivities,
      actionStats,
      entityStats,
    ] = await Promise.all([
      db.activityLog.count({ where }),
      db.activityLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      db.activityLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
      }),
    ]);

    return {
      totalActivities,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.action,
      })),
      entityStats: entityStats.map(stat => ({
        entity: stat.entity,
        count: stat._count.entity,
      })),
    };
  }
}
