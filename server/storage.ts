import {
  users,
  memberships,
  membershipPlans,
  gymClasses,
  classBookings,
  checkIns,
  payments,
  feedbacks,
  personalTrainers,
  ptBookings,
  ptSessionPackages,
  ptSessionAttendance,
  oneTimeQrCodes,
  passwordResetTokens,
  notifications,
  type User,
  type UpsertUser,
  type Membership,
  type InsertMembership,
  type MembershipPlan,
  type InsertMembershipPlan,
  type GymClass,
  type InsertGymClass,
  type ClassBooking,
  type InsertClassBooking,
  type CheckIn,
  type InsertCheckIn,
  type Payment,
  type InsertPayment,
  type Feedback,
  type InsertFeedback,
  type PersonalTrainer,
  type InsertPersonalTrainer,
  type PtBooking,
  type InsertPtBooking,
  type PtSessionPackage,
  type InsertPtSessionPackage,
  type PtSessionAttendance,
  type InsertPtSessionAttendance,
  type OneTimeQrCode,
  type InsertOneTimeQrCode,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, lte, and, or, count, sum } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailOrPhoneOrUsername(identifier: string): Promise<User | undefined>;
  getUserByPermanentQrCode(qrCode: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  ensureUserPermanentQrCode(userId: string): Promise<string>;
  
  // Membership operations
  getMembershipPlans(): Promise<MembershipPlan[]>;
  getAllMembershipPlans(): Promise<MembershipPlan[]>;
  createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan>;
  updateMembershipPlan(id: string, plan: Partial<InsertMembershipPlan>): Promise<MembershipPlan>;
  deleteMembershipPlan(id: string): Promise<void>;
  getUserMembership(userId: string): Promise<(Membership & { plan: MembershipPlan }) | undefined>;
  createMembership(membership: InsertMembership): Promise<Membership>;
  updateMembership(id: string, membership: Partial<InsertMembership>): Promise<void>;
  updateMembershipStatus(id: string, status: string): Promise<void>;
  cancelUserMemberships(userId: string): Promise<void>;
  getExpiringMemberships(days: number): Promise<(Membership & { user: User; plan: MembershipPlan })[]>;
  
  // Class operations
  getGymClasses(): Promise<GymClass[]>;
  createGymClass(gymClass: InsertGymClass): Promise<GymClass>;
  updateGymClass(id: string, gymClass: Partial<InsertGymClass>): Promise<void>;
  deleteGymClass(id: string): Promise<void>;
  getUserClassBookings(userId: string): Promise<(ClassBooking & { gymClass: GymClass })[]>;
  getAllClassBookings(): Promise<(ClassBooking & { user: User; gymClass: GymClass })[]>;
  bookClass(booking: InsertClassBooking): Promise<ClassBooking>;
  updateClassBookingStatus(id: string, status: string): Promise<void>;
  cancelClassBooking(id: string): Promise<void>;
  
  // Check-in operations
  getUserCheckIns(userId: string, limit?: number): Promise<CheckIn[]>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  updateCheckOut(id: string): Promise<void>;
  getCurrentCrowdCount(): Promise<number>;
  validateCheckInQR(qrCode: string): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined>;
  validateMemberQrAndCheckIn(qrCode: string): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined>;
  getRecentCheckIns(limit?: number): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } })[]>;
  autoCheckoutExpiredSessions(): Promise<number>;
  
  // One-time QR code operations
  generateOneTimeQrCode(userId: string): Promise<OneTimeQrCode>;
  validateOneTimeQrCode(qrCode: string): Promise<(OneTimeQrCode & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined>;
  markQrCodeAsUsed(qrCode: string): Promise<void>;
  cleanupExpiredQrCodes(): Promise<number>;
  
  // Payment operations
  getUserPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string): Promise<void>;
  updatePaymentStatusByTransactionId(transactionId: string, status: string): Promise<void>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUsersWithMemberships(): Promise<(User & { membership?: Membership & { plan: MembershipPlan } })[]>;
  getRevenueStats(): Promise<{ total: number; thisMonth: number; lastMonth: number }>;
  getMembershipStats(): Promise<{ total: number; active: number; expiringSoon: number }>;
  
  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getUserFeedbacks(userId: string): Promise<Feedback[]>;
  getAllFeedbacks(): Promise<(Feedback & { user: User })[]>;
  updateFeedbackStatus(id: string, status: string, adminResponse?: string): Promise<void>;
  
  // Personal Trainer operations
  getAllTrainers(): Promise<PersonalTrainer[]>;
  getActiveTrainers(): Promise<PersonalTrainer[]>;
  getTrainerById(id: string): Promise<PersonalTrainer | undefined>;
  createTrainer(trainer: InsertPersonalTrainer): Promise<PersonalTrainer>;
  updateTrainer(id: string, trainer: Partial<InsertPersonalTrainer>): Promise<void>;
  deleteTrainer(id: string): Promise<void>;
  
  // PT Booking operations
  getUserPtBookings(userId: string): Promise<(PtBooking & { trainer: PersonalTrainer })[]>;
  getAllPtBookings(): Promise<(PtBooking & { user: User; trainer: PersonalTrainer })[]>;
  getPtBookingById(id: string): Promise<(PtBooking & { user: User; trainer: PersonalTrainer }) | undefined>;
  createPtBooking(booking: InsertPtBooking): Promise<PtBooking>;
  updatePtBookingStatus(id: string, status: string): Promise<void>;
  cancelPtBooking(id: string): Promise<void>;
  
  // PT Session Package operations
  createPtSessionPackage(packageData: InsertPtSessionPackage): Promise<PtSessionPackage>;
  getUserPtSessionPackages(userId: string): Promise<(PtSessionPackage & { trainer: PersonalTrainer })[]>;
  getPtSessionPackageById(id: string): Promise<(PtSessionPackage & { trainer: PersonalTrainer; user: User }) | undefined>;
  updatePtSessionPackage(id: string, packageData: Partial<InsertPtSessionPackage>): Promise<void>;
  
  // PT Session Attendance operations
  createPtSessionAttendance(attendanceData: InsertPtSessionAttendance): Promise<PtSessionAttendance>;
  getPackageAttendanceSessions(packageId: string): Promise<(PtSessionAttendance & { trainer: PersonalTrainer })[]>;
  getUserPtAttendanceSessions(userId: string): Promise<(PtSessionAttendance & { trainer: PersonalTrainer; package: PtSessionPackage })[]>;
  getPtSessionAttendanceById(id: string): Promise<(PtSessionAttendance & { trainer: PersonalTrainer; user: User; package: PtSessionPackage }) | undefined>;
  updatePtSessionAttendance(id: string, attendanceData: Partial<InsertPtSessionAttendance>): Promise<void>;
  confirmPtSessionAttendance(id: string, adminId: string): Promise<void>;
  
  // Password Reset operations
  createPasswordResetToken(email: string, token: string): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  cleanupExpiredResetTokens(): Promise<number>;
  updateUserPassword(email: string, newPassword: string): Promise<void>;
  
  // Email verification operations
  storeVerificationCode(email: string, code: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<boolean>;
  
  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  
  // Inactive member operations
  getInactiveMembers(daysInactive: number): Promise<(User & { membership: Membership & { plan: MembershipPlan } })[]>;
  sendInactivityReminders(daysInactive: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByEmailOrPhoneOrUsername(identifier: string): Promise<User | undefined> {
    // Normalize identifier (trim)
    const normalizedIdentifier = identifier.trim();
    
    // Try to find user by username first
    let user = await this.getUserByUsername(normalizedIdentifier);
    if (user) return user;
    
    // Try to find user by email
    user = await this.getUserByEmail(normalizedIdentifier);
    if (user) return user;
    
    // Try to find user by phone (only if identifier is not empty and phone exists)
    const [userByPhone] = await db
      .select()
      .from(users)
      .where(eq(users.phone, normalizedIdentifier))
      .limit(1);
    
    return userByPhone;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByPermanentQrCode(qrCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.permanentQrCode, qrCode));
    return user;
  }

  async ensureUserPermanentQrCode(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // If user already has a permanent QR code, return it
    if (user.permanentQrCode) {
      return user.permanentQrCode;
    }
    
    // Generate a new permanent QR code
    const { randomUUID } = await import('crypto');
    const qrCode = randomUUID();
    
    // Update user with new permanent QR code
    await db
      .update(users)
      .set({
        permanentQrCode: qrCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    return qrCode;
  }

  // Membership operations
  async getMembershipPlans(): Promise<MembershipPlan[]> {
    return await db.select().from(membershipPlans).where(eq(membershipPlans.active, true));
  }

  async getAllMembershipPlans(): Promise<MembershipPlan[]> {
    return await db.select().from(membershipPlans);
  }

  async createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan> {
    const [newPlan] = await db.insert(membershipPlans).values(plan).returning();
    return newPlan;
  }

  async updateMembershipPlan(id: string, plan: Partial<InsertMembershipPlan>): Promise<MembershipPlan> {
    const [updatedPlan] = await db
      .update(membershipPlans)
      .set(plan)
      .where(eq(membershipPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteMembershipPlan(id: string): Promise<void> {
    await db.update(membershipPlans).set({ active: false }).where(eq(membershipPlans.id, id));
  }

  async getUserMembership(userId: string): Promise<(Membership & { plan: MembershipPlan }) | undefined> {
    const result = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        planId: memberships.planId,
        startDate: memberships.startDate,
        endDate: memberships.endDate,
        status: memberships.status,
        autoRenewal: memberships.autoRenewal,
        createdAt: memberships.createdAt,
        plan: membershipPlans,
      })
      .from(memberships)
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
      .limit(1);

    return result[0];
  }

  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [newMembership] = await db.insert(memberships).values(membership).returning();
    return newMembership;
  }

  async updateMembership(id: string, membershipData: Partial<InsertMembership>): Promise<void> {
    await db.update(memberships).set(membershipData).where(eq(memberships.id, id));
  }

  async updateMembershipStatus(id: string, status: string): Promise<void> {
    await db.update(memberships).set({ status }).where(eq(memberships.id, id));
  }

  async cancelUserMemberships(userId: string): Promise<void> {
    await db.update(memberships)
      .set({ status: 'cancelled' })
      .where(eq(memberships.userId, userId));
  }

  async getExpiringMemberships(days: number): Promise<(Membership & { user: User; plan: MembershipPlan })[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        planId: memberships.planId,
        startDate: memberships.startDate,
        endDate: memberships.endDate,
        status: memberships.status,
        autoRenewal: memberships.autoRenewal,
        createdAt: memberships.createdAt,
        user: users,
        plan: membershipPlans,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(
        and(
          eq(memberships.status, "active"),
          lte(memberships.endDate, cutoffDate)
        )
      );
  }

  // Class operations
  async getGymClasses(): Promise<GymClass[]> {
    return await db.select().from(gymClasses).where(eq(gymClasses.active, true));
  }

  async createGymClass(gymClass: InsertGymClass): Promise<GymClass> {
    const [newClass] = await db.insert(gymClasses).values(gymClass).returning();
    return newClass;
  }

  async updateGymClass(id: string, gymClass: Partial<InsertGymClass>): Promise<void> {
    await db.update(gymClasses).set(gymClass).where(eq(gymClasses.id, id));
  }

  async deleteGymClass(id: string): Promise<void> {
    await db.update(gymClasses).set({ active: false }).where(eq(gymClasses.id, id));
  }

  async getUserClassBookings(userId: string): Promise<(ClassBooking & { gymClass: GymClass })[]> {
    return await db
      .select({
        id: classBookings.id,
        userId: classBookings.userId,
        classId: classBookings.classId,
        bookingDate: classBookings.bookingDate,
        status: classBookings.status,
        createdAt: classBookings.createdAt,
        gymClass: gymClasses,
      })
      .from(classBookings)
      .innerJoin(gymClasses, eq(classBookings.classId, gymClasses.id))
      .where(eq(classBookings.userId, userId))
      .orderBy(desc(classBookings.bookingDate));
  }

  async getAllClassBookings(): Promise<(ClassBooking & { user: User; gymClass: GymClass })[]> {
    return await db
      .select({
        id: classBookings.id,
        userId: classBookings.userId,
        classId: classBookings.classId,
        bookingDate: classBookings.bookingDate,
        status: classBookings.status,
        createdAt: classBookings.createdAt,
        user: users,
        gymClass: gymClasses,
      })
      .from(classBookings)
      .innerJoin(users, eq(classBookings.userId, users.id))
      .innerJoin(gymClasses, eq(classBookings.classId, gymClasses.id))
      .orderBy(desc(classBookings.bookingDate));
  }

  async bookClass(booking: InsertClassBooking): Promise<ClassBooking> {
    const [newBooking] = await db.insert(classBookings).values(booking).returning();
    
    // Update class enrollment count - get current count first
    const currentBookings = await db
      .select({ count: count() })
      .from(classBookings)
      .where(and(eq(classBookings.classId, booking.classId), eq(classBookings.status, "booked")));
    
    await db
      .update(gymClasses)
      .set({ currentEnrollment: currentBookings[0]?.count || 0 })
      .where(eq(gymClasses.id, booking.classId));
    
    return newBooking;
  }

  async updateClassBookingStatus(id: string, status: string): Promise<void> {
    const [booking] = await db.select().from(classBookings).where(eq(classBookings.id, id));
    
    if (!booking) {
      return;
    }

    await db.update(classBookings).set({ status }).where(eq(classBookings.id, id));
    
    // Update class enrollment count
    const currentBookings = await db
      .select({ count: count() })
      .from(classBookings)
      .where(and(eq(classBookings.classId, booking.classId), eq(classBookings.status, "booked")));
    
    await db
      .update(gymClasses)
      .set({ currentEnrollment: currentBookings[0]?.count || 0 })
      .where(eq(gymClasses.id, booking.classId));
  }

  async cancelClassBooking(id: string): Promise<void> {
    const [booking] = await db.select().from(classBookings).where(eq(classBookings.id, id));
    
    if (!booking || booking.status === 'cancelled') {
      return;
    }

    await db.update(classBookings).set({ status: "cancelled" }).where(eq(classBookings.id, id));
    
    const currentBookings = await db
      .select({ count: count() })
      .from(classBookings)
      .where(and(eq(classBookings.classId, booking.classId), eq(classBookings.status, "booked")));
    
    await db
      .update(gymClasses)
      .set({ currentEnrollment: currentBookings[0]?.count || 0 })
      .where(eq(gymClasses.id, booking.classId));
  }

  // Check-in operations
  async getUserCheckIns(userId: string, limit = 10): Promise<CheckIn[]> {
    return await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.checkInTime))
      .limit(limit);
  }

  async createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn> {
    const [newCheckIn] = await db.insert(checkIns).values(checkIn).returning();
    return newCheckIn;
  }

  async updateCheckOut(id: string): Promise<void> {
    await db
      .update(checkIns)
      .set({ checkOutTime: new Date(), status: "completed" })
      .where(eq(checkIns.id, id));
  }

  async getCurrentCrowdCount(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(checkIns)
      .where(eq(checkIns.status, "active"));
    
    return result[0]?.count || 0;
  }

  async validateCheckInQR(qrCode: string): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined> {
    const result = await db
      .select({
        id: checkIns.id,
        userId: checkIns.userId,
        checkInTime: checkIns.checkInTime,
        checkOutTime: checkIns.checkOutTime,
        qrCode: checkIns.qrCode,
        status: checkIns.status,
        createdAt: checkIns.createdAt,
        user: users,
        membershipId: memberships.id,
        membershipUserId: memberships.userId,
        membershipPlanId: memberships.planId,
        membershipStartDate: memberships.startDate,
        membershipEndDate: memberships.endDate,
        membershipStatus: memberships.status,
        membershipAutoRenewal: memberships.autoRenewal,
        membershipCreatedAt: memberships.createdAt,
        planId: membershipPlans.id,
        planName: membershipPlans.name,
        planDescription: membershipPlans.description,
        planPrice: membershipPlans.price,
        planDurationMonths: membershipPlans.durationMonths,
        planFeatures: membershipPlans.features,
        planStripePriceId: membershipPlans.stripePriceId,
        planActive: membershipPlans.active,
        planCreatedAt: membershipPlans.createdAt,
      })
      .from(checkIns)
      .innerJoin(users, eq(checkIns.userId, users.id))
      .leftJoin(memberships, and(eq(users.id, memberships.userId), eq(memberships.status, "active")))
      .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(and(eq(checkIns.qrCode, qrCode), eq(checkIns.status, "active")))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      qrCode: row.qrCode,
      status: row.status,
      createdAt: row.createdAt,
      user: row.user,
      membership: row.membershipId ? {
        id: row.membershipId,
        userId: row.membershipUserId!,
        planId: row.membershipPlanId!,
        startDate: row.membershipStartDate!,
        endDate: row.membershipEndDate!,
        status: row.membershipStatus!,
        autoRenewal: row.membershipAutoRenewal!,
        createdAt: row.membershipCreatedAt!,
        plan: {
          id: row.planId!,
          name: row.planName!,
          description: row.planDescription,
          price: row.planPrice!,
          durationMonths: row.planDurationMonths!,
          features: row.planFeatures,
          stripePriceId: row.planStripePriceId,
          active: row.planActive!,
          createdAt: row.planCreatedAt!,
        }
      } : undefined
    };
  }

  async validateMemberQrAndCheckIn(qrCode: string): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined> {
    // Find user by permanent QR code
    const user = await this.getUserByPermanentQrCode(qrCode);
    if (!user) {
      return undefined;
    }

    // Check if user has an active check-in today
    const existingCheckIn = await db
      .select({
        id: checkIns.id,
        userId: checkIns.userId,
        checkInTime: checkIns.checkInTime,
        checkOutTime: checkIns.checkOutTime,
        qrCode: checkIns.qrCode,
        status: checkIns.status,
        createdAt: checkIns.createdAt,
      })
      .from(checkIns)
      .where(and(eq(checkIns.userId, user.id), eq(checkIns.status, "active")))
      .limit(1);

    let checkIn: CheckIn;
    
    if (existingCheckIn.length > 0) {
      // User already has an active check-in
      checkIn = existingCheckIn[0];
    } else {
      // Create new check-in
      const { randomUUID } = await import('crypto');
      const newCheckInQr = randomUUID();
      const [newCheckIn] = await db
        .insert(checkIns)
        .values({
          userId: user.id,
          qrCode: newCheckInQr,
          status: 'active',
        })
        .returning();
      checkIn = newCheckIn;
    }

    // Get membership info
    const membership = await this.getUserMembership(user.id);

    return {
      ...checkIn,
      user,
      membership,
    };
  }

  async getRecentCheckIns(limit = 20): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } })[]> {
    const result = await db
      .select({
        id: checkIns.id,
        userId: checkIns.userId,
        checkInTime: checkIns.checkInTime,
        checkOutTime: checkIns.checkOutTime,
        qrCode: checkIns.qrCode,
        status: checkIns.status,
        createdAt: checkIns.createdAt,
        user: users,
        membershipId: memberships.id,
        membershipUserId: memberships.userId,
        membershipPlanId: memberships.planId,
        membershipStartDate: memberships.startDate,
        membershipEndDate: memberships.endDate,
        membershipStatus: memberships.status,
        membershipAutoRenewal: memberships.autoRenewal,
        membershipCreatedAt: memberships.createdAt,
        planId: membershipPlans.id,
        planName: membershipPlans.name,
        planDescription: membershipPlans.description,
        planPrice: membershipPlans.price,
        planDurationMonths: membershipPlans.durationMonths,
        planFeatures: membershipPlans.features,
        planStripePriceId: membershipPlans.stripePriceId,
        planActive: membershipPlans.active,
        planCreatedAt: membershipPlans.createdAt,
      })
      .from(checkIns)
      .innerJoin(users, eq(checkIns.userId, users.id))
      .leftJoin(memberships, and(eq(users.id, memberships.userId), eq(memberships.status, "active")))
      .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .orderBy(desc(checkIns.checkInTime))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      qrCode: row.qrCode,
      status: row.status,
      createdAt: row.createdAt,
      user: row.user,
      membership: row.membershipId ? {
        id: row.membershipId,
        userId: row.membershipUserId!,
        planId: row.membershipPlanId!,
        startDate: row.membershipStartDate!,
        endDate: row.membershipEndDate!,
        status: row.membershipStatus!,
        autoRenewal: row.membershipAutoRenewal!,
        createdAt: row.membershipCreatedAt!,
        plan: {
          id: row.planId!,
          name: row.planName!,
          description: row.planDescription,
          price: row.planPrice!,
          durationMonths: row.planDurationMonths!,
          features: row.planFeatures,
          stripePriceId: row.planStripePriceId,
          active: row.planActive!,
          createdAt: row.planCreatedAt!,
        }
      } : undefined
    }));
  }

  async autoCheckoutExpiredSessions(): Promise<number> {
    const threeHoursAgo = new Date();
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

    const expiredCheckIns = await db
      .select()
      .from(checkIns)
      .where(
        and(
          eq(checkIns.status, "active"),
          lte(checkIns.checkInTime, threeHoursAgo)
        )
      );

    if (expiredCheckIns.length === 0) {
      return 0;
    }

    for (const checkIn of expiredCheckIns) {
      await db
        .update(checkIns)
        .set({ 
          checkOutTime: new Date(), 
          status: "completed" 
        })
        .where(eq(checkIns.id, checkIn.id));
    }

    console.log(`Auto-checkout: ${expiredCheckIns.length} member(s) checked out automatically after 3 hours`);
    return expiredCheckIns.length;
  }

  // Payment operations
  async getUserPayments(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePaymentStatus(id: string, status: string): Promise<void> {
    await db.update(payments).set({ status }).where(eq(payments.id, id));
  }

  async updatePaymentStatusByTransactionId(transactionId: string, status: string): Promise<void> {
    await db.update(payments).set({ status }).where(eq(payments.stripePaymentIntentId, transactionId));
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    // For now, we'll use the description field to store order ID
    // In production, you might want to add a separate orderId column
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.description, orderId));
    return payment;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersWithMemberships(): Promise<(User & { membership?: Membership & { plan: MembershipPlan } })[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        active: users.active,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        membershipId: memberships.id,
        membershipUserId: memberships.userId,
        membershipPlanId: memberships.planId,
        membershipStartDate: memberships.startDate,
        membershipEndDate: memberships.endDate,
        membershipStatus: memberships.status,
        membershipAutoRenewal: memberships.autoRenewal,
        membershipCreatedAt: memberships.createdAt,
        planId: membershipPlans.id,
        planName: membershipPlans.name,
        planDescription: membershipPlans.description,
        planPrice: membershipPlans.price,
        planDurationMonths: membershipPlans.durationMonths,
        planFeatures: membershipPlans.features,
        planStripePriceId: membershipPlans.stripePriceId,
        planActive: membershipPlans.active,
        planCreatedAt: membershipPlans.createdAt,
      })
      .from(users)
      .leftJoin(memberships, and(eq(users.id, memberships.userId), eq(memberships.status, "active")))
      .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id));

    return result.map(row => ({
      id: row.id,
      username: row.username,
      password: '', // Never expose password hashes
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      profileImageUrl: row.profileImageUrl,
      role: row.role,
      active: row.active,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      membership: row.membershipId ? {
        id: row.membershipId,
        userId: row.membershipUserId!,
        planId: row.membershipPlanId!,
        startDate: row.membershipStartDate!,
        endDate: row.membershipEndDate!,
        status: row.membershipStatus!,
        autoRenewal: row.membershipAutoRenewal!,
        createdAt: row.membershipCreatedAt!,
        plan: {
          id: row.planId!,
          name: row.planName!,
          description: row.planDescription,
          price: row.planPrice!,
          durationMonths: row.planDurationMonths!,
          features: row.planFeatures,
          stripePriceId: row.planStripePriceId,
          active: row.planActive!,
          createdAt: row.planCreatedAt!,
        }
      } : undefined
    }));
  }

  async getRevenueStats(): Promise<{ total: number; thisMonth: number; lastMonth: number }> {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [totalResult] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "completed"));

    const [thisMonthResult] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.status, "completed"),
          gte(payments.createdAt, firstDayThisMonth)
        )
      );

    const [lastMonthResult] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.status, "completed"),
          gte(payments.createdAt, firstDayLastMonth),
          lte(payments.createdAt, lastDayLastMonth)
        )
      );

    return {
      total: Number(totalResult?.total || 0),
      thisMonth: Number(thisMonthResult?.total || 0),
      lastMonth: Number(lastMonthResult?.total || 0),
    };
  }

  async getMembershipStats(): Promise<{ total: number; active: number; expiringSoon: number }> {
    const [totalResult] = await db.select({ count: count() }).from(memberships);
    
    const [activeResult] = await db
      .select({ count: count() })
      .from(memberships)
      .where(eq(memberships.status, "active"));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 20);

    const [expiringSoonResult] = await db
      .select({ count: count() })
      .from(memberships)
      .where(
        and(
          eq(memberships.status, "active"),
          lte(memberships.endDate, cutoffDate)
        )
      );

    return {
      total: totalResult?.count || 0,
      active: activeResult?.count || 0,
      expiringSoon: expiringSoonResult?.count || 0,
    };
  }

  // Feedback operations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [feedback] = await db.insert(feedbacks).values(feedbackData).returning();
    return feedback;
  }

  async getUserFeedbacks(userId: string): Promise<Feedback[]> {
    return await db.select().from(feedbacks).where(eq(feedbacks.userId, userId)).orderBy(desc(feedbacks.createdAt));
  }

  async getAllFeedbacks(): Promise<(Feedback & { user: User })[]> {
    const result = await db
      .select({
        id: feedbacks.id,
        userId: feedbacks.userId,
        subject: feedbacks.subject,
        message: feedbacks.message,
        rating: feedbacks.rating,
        status: feedbacks.status,
        adminResponse: feedbacks.adminResponse,
        createdAt: feedbacks.createdAt,
        updatedAt: feedbacks.updatedAt,
        user: users,
      })
      .from(feedbacks)
      .leftJoin(users, eq(feedbacks.userId, users.id))
      .orderBy(desc(feedbacks.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      subject: row.subject,
      message: row.message,
      rating: row.rating,
      status: row.status,
      adminResponse: row.adminResponse,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user!,
    }));
  }

  async updateFeedbackStatus(id: string, status: string, adminResponse?: string): Promise<void> {
    await db
      .update(feedbacks)
      .set({
        status,
        adminResponse,
        updatedAt: new Date(),
      })
      .where(eq(feedbacks.id, id));
  }

  // Personal Trainer operations
  async getAllTrainers(): Promise<PersonalTrainer[]> {
    return await db.select().from(personalTrainers).orderBy(desc(personalTrainers.createdAt));
  }

  async getActiveTrainers(): Promise<PersonalTrainer[]> {
    return await db.select().from(personalTrainers).where(eq(personalTrainers.active, true)).orderBy(desc(personalTrainers.createdAt));
  }

  async getTrainerById(id: string): Promise<PersonalTrainer | undefined> {
    const [trainer] = await db.select().from(personalTrainers).where(eq(personalTrainers.id, id));
    return trainer;
  }

  async createTrainer(trainerData: InsertPersonalTrainer): Promise<PersonalTrainer> {
    const [trainer] = await db.insert(personalTrainers).values(trainerData).returning();
    return trainer;
  }

  async updateTrainer(id: string, trainerData: Partial<InsertPersonalTrainer>): Promise<void> {
    await db
      .update(personalTrainers)
      .set({
        ...trainerData,
        updatedAt: new Date(),
      })
      .where(eq(personalTrainers.id, id));
  }

  async deleteTrainer(id: string): Promise<void> {
    await db.update(personalTrainers).set({ active: false, updatedAt: new Date() }).where(eq(personalTrainers.id, id));
  }

  // PT Booking operations
  async getUserPtBookings(userId: string): Promise<(PtBooking & { trainer: PersonalTrainer })[]> {
    const result = await db
      .select({
        id: ptBookings.id,
        userId: ptBookings.userId,
        trainerId: ptBookings.trainerId,
        bookingDate: ptBookings.bookingDate,
        duration: ptBookings.duration,
        status: ptBookings.status,
        notes: ptBookings.notes,
        createdAt: ptBookings.createdAt,
        updatedAt: ptBookings.updatedAt,
        trainer: personalTrainers,
      })
      .from(ptBookings)
      .innerJoin(personalTrainers, eq(ptBookings.trainerId, personalTrainers.id))
      .where(eq(ptBookings.userId, userId))
      .orderBy(desc(ptBookings.bookingDate));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      trainerId: row.trainerId,
      bookingDate: row.bookingDate,
      duration: row.duration,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trainer: row.trainer,
    }));
  }

  async getAllPtBookings(): Promise<(PtBooking & { user: User; trainer: PersonalTrainer })[]> {
    const result = await db
      .select({
        id: ptBookings.id,
        userId: ptBookings.userId,
        trainerId: ptBookings.trainerId,
        bookingDate: ptBookings.bookingDate,
        duration: ptBookings.duration,
        status: ptBookings.status,
        notes: ptBookings.notes,
        createdAt: ptBookings.createdAt,
        updatedAt: ptBookings.updatedAt,
        user: users,
        trainer: personalTrainers,
      })
      .from(ptBookings)
      .innerJoin(users, eq(ptBookings.userId, users.id))
      .innerJoin(personalTrainers, eq(ptBookings.trainerId, personalTrainers.id))
      .orderBy(desc(ptBookings.bookingDate));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      trainerId: row.trainerId,
      bookingDate: row.bookingDate,
      duration: row.duration,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user,
      trainer: row.trainer,
    }));
  }

  async getPtBookingById(id: string): Promise<(PtBooking & { user: User; trainer: PersonalTrainer }) | undefined> {
    const result = await db
      .select({
        id: ptBookings.id,
        userId: ptBookings.userId,
        trainerId: ptBookings.trainerId,
        bookingDate: ptBookings.bookingDate,
        duration: ptBookings.duration,
        status: ptBookings.status,
        notes: ptBookings.notes,
        createdAt: ptBookings.createdAt,
        updatedAt: ptBookings.updatedAt,
        user: users,
        trainer: personalTrainers,
      })
      .from(ptBookings)
      .innerJoin(users, eq(ptBookings.userId, users.id))
      .innerJoin(personalTrainers, eq(ptBookings.trainerId, personalTrainers.id))
      .where(eq(ptBookings.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      trainerId: row.trainerId,
      bookingDate: row.bookingDate,
      duration: row.duration,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user,
      trainer: row.trainer,
    };
  }

  async createPtBooking(bookingData: InsertPtBooking): Promise<PtBooking> {
    const [booking] = await db.insert(ptBookings).values(bookingData).returning();
    return booking;
  }

  async updatePtBookingStatus(id: string, status: string): Promise<void> {
    await db
      .update(ptBookings)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(ptBookings.id, id));
  }

  async cancelPtBooking(id: string): Promise<void> {
    await db
      .update(ptBookings)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(ptBookings.id, id));
  }

  // PT Session Package operations
  async createPtSessionPackage(packageData: InsertPtSessionPackage): Promise<PtSessionPackage> {
    const [pkg] = await db.insert(ptSessionPackages).values(packageData).returning();
    return pkg;
  }

  async getUserPtSessionPackages(userId: string): Promise<(PtSessionPackage & { trainer: PersonalTrainer })[]> {
    const result = await db
      .select({
        id: ptSessionPackages.id,
        userId: ptSessionPackages.userId,
        trainerId: ptSessionPackages.trainerId,
        totalSessions: ptSessionPackages.totalSessions,
        usedSessions: ptSessionPackages.usedSessions,
        remainingSessions: ptSessionPackages.remainingSessions,
        pricePerSession: ptSessionPackages.pricePerSession,
        totalPrice: ptSessionPackages.totalPrice,
        status: ptSessionPackages.status,
        purchaseDate: ptSessionPackages.purchaseDate,
        expiryDate: ptSessionPackages.expiryDate,
        createdAt: ptSessionPackages.createdAt,
        updatedAt: ptSessionPackages.updatedAt,
        trainer: personalTrainers,
      })
      .from(ptSessionPackages)
      .innerJoin(personalTrainers, eq(ptSessionPackages.trainerId, personalTrainers.id))
      .where(eq(ptSessionPackages.userId, userId))
      .orderBy(desc(ptSessionPackages.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      trainerId: row.trainerId,
      totalSessions: row.totalSessions,
      usedSessions: row.usedSessions,
      remainingSessions: row.remainingSessions,
      pricePerSession: row.pricePerSession,
      totalPrice: row.totalPrice,
      status: row.status,
      purchaseDate: row.purchaseDate,
      expiryDate: row.expiryDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trainer: row.trainer,
    }));
  }

  async getPtSessionPackageById(id: string): Promise<(PtSessionPackage & { trainer: PersonalTrainer; user: User }) | undefined> {
    const result = await db
      .select({
        id: ptSessionPackages.id,
        userId: ptSessionPackages.userId,
        trainerId: ptSessionPackages.trainerId,
        totalSessions: ptSessionPackages.totalSessions,
        usedSessions: ptSessionPackages.usedSessions,
        remainingSessions: ptSessionPackages.remainingSessions,
        pricePerSession: ptSessionPackages.pricePerSession,
        totalPrice: ptSessionPackages.totalPrice,
        status: ptSessionPackages.status,
        purchaseDate: ptSessionPackages.purchaseDate,
        expiryDate: ptSessionPackages.expiryDate,
        createdAt: ptSessionPackages.createdAt,
        updatedAt: ptSessionPackages.updatedAt,
        trainer: personalTrainers,
        user: users,
      })
      .from(ptSessionPackages)
      .innerJoin(personalTrainers, eq(ptSessionPackages.trainerId, personalTrainers.id))
      .innerJoin(users, eq(ptSessionPackages.userId, users.id))
      .where(eq(ptSessionPackages.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      trainerId: row.trainerId,
      totalSessions: row.totalSessions,
      usedSessions: row.usedSessions,
      remainingSessions: row.remainingSessions,
      pricePerSession: row.pricePerSession,
      totalPrice: row.totalPrice,
      status: row.status,
      purchaseDate: row.purchaseDate,
      expiryDate: row.expiryDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trainer: row.trainer,
      user: row.user,
    };
  }

  async updatePtSessionPackage(id: string, packageData: Partial<InsertPtSessionPackage>): Promise<void> {
    await db
      .update(ptSessionPackages)
      .set({
        ...packageData,
        updatedAt: new Date(),
      })
      .where(eq(ptSessionPackages.id, id));
  }

  // PT Session Attendance operations
  async createPtSessionAttendance(attendanceData: InsertPtSessionAttendance): Promise<PtSessionAttendance> {
    const [attendance] = await db.insert(ptSessionAttendance).values(attendanceData).returning();
    return attendance;
  }

  async getPackageAttendanceSessions(packageId: string): Promise<(PtSessionAttendance & { trainer: PersonalTrainer })[]> {
    const result = await db
      .select({
        id: ptSessionAttendance.id,
        packageId: ptSessionAttendance.packageId,
        userId: ptSessionAttendance.userId,
        trainerId: ptSessionAttendance.trainerId,
        sessionDate: ptSessionAttendance.sessionDate,
        sessionNumber: ptSessionAttendance.sessionNumber,
        status: ptSessionAttendance.status,
        checkInTime: ptSessionAttendance.checkInTime,
        checkOutTime: ptSessionAttendance.checkOutTime,
        notes: ptSessionAttendance.notes,
        adminConfirmed: ptSessionAttendance.adminConfirmed,
        confirmedBy: ptSessionAttendance.confirmedBy,
        confirmedAt: ptSessionAttendance.confirmedAt,
        createdAt: ptSessionAttendance.createdAt,
        updatedAt: ptSessionAttendance.updatedAt,
        trainer: personalTrainers,
      })
      .from(ptSessionAttendance)
      .innerJoin(personalTrainers, eq(ptSessionAttendance.trainerId, personalTrainers.id))
      .where(eq(ptSessionAttendance.packageId, packageId))
      .orderBy(desc(ptSessionAttendance.sessionNumber));

    return result.map(row => ({
      id: row.id,
      packageId: row.packageId,
      userId: row.userId,
      trainerId: row.trainerId,
      sessionDate: row.sessionDate,
      sessionNumber: row.sessionNumber,
      status: row.status,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      notes: row.notes,
      adminConfirmed: row.adminConfirmed,
      confirmedBy: row.confirmedBy,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trainer: row.trainer,
    }));
  }

  async getUserPtAttendanceSessions(userId: string): Promise<(PtSessionAttendance & { trainer: PersonalTrainer; package: PtSessionPackage })[]> {
    const result = await db
      .select({
        id: ptSessionAttendance.id,
        packageId: ptSessionAttendance.packageId,
        userId: ptSessionAttendance.userId,
        trainerId: ptSessionAttendance.trainerId,
        sessionDate: ptSessionAttendance.sessionDate,
        sessionNumber: ptSessionAttendance.sessionNumber,
        status: ptSessionAttendance.status,
        checkInTime: ptSessionAttendance.checkInTime,
        checkOutTime: ptSessionAttendance.checkOutTime,
        notes: ptSessionAttendance.notes,
        adminConfirmed: ptSessionAttendance.adminConfirmed,
        confirmedBy: ptSessionAttendance.confirmedBy,
        confirmedAt: ptSessionAttendance.confirmedAt,
        createdAt: ptSessionAttendance.createdAt,
        updatedAt: ptSessionAttendance.updatedAt,
        trainer: personalTrainers,
        package: ptSessionPackages,
      })
      .from(ptSessionAttendance)
      .innerJoin(personalTrainers, eq(ptSessionAttendance.trainerId, personalTrainers.id))
      .innerJoin(ptSessionPackages, eq(ptSessionAttendance.packageId, ptSessionPackages.id))
      .where(eq(ptSessionAttendance.userId, userId))
      .orderBy(desc(ptSessionAttendance.sessionDate));

    return result.map(row => ({
      id: row.id,
      packageId: row.packageId,
      userId: row.userId,
      trainerId: row.trainerId,
      sessionDate: row.sessionDate,
      sessionNumber: row.sessionNumber,
      status: row.status,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      notes: row.notes,
      adminConfirmed: row.adminConfirmed,
      confirmedBy: row.confirmedBy,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trainer: row.trainer,
      package: row.package,
    }));
  }

  async getPtSessionAttendanceById(id: string): Promise<(PtSessionAttendance & { trainer: PersonalTrainer; user: User; package: PtSessionPackage }) | undefined> {
    const result = await db
      .select({
        id: ptSessionAttendance.id,
        packageId: ptSessionAttendance.packageId,
        userId: ptSessionAttendance.userId,
        trainerId: ptSessionAttendance.trainerId,
        sessionDate: ptSessionAttendance.sessionDate,
        sessionNumber: ptSessionAttendance.sessionNumber,
        status: ptSessionAttendance.status,
        checkInTime: ptSessionAttendance.checkInTime,
        checkOutTime: ptSessionAttendance.checkOutTime,
        notes: ptSessionAttendance.notes,
        adminConfirmed: ptSessionAttendance.adminConfirmed,
        confirmedBy: ptSessionAttendance.confirmedBy,
        confirmedAt: ptSessionAttendance.confirmedAt,
        createdAt: ptSessionAttendance.createdAt,
        updatedAt: ptSessionAttendance.updatedAt,
        trainer: personalTrainers,
        user: users,
        package: ptSessionPackages,
      })
      .from(ptSessionAttendance)
      .innerJoin(personalTrainers, eq(ptSessionAttendance.trainerId, personalTrainers.id))
      .innerJoin(users, eq(ptSessionAttendance.userId, users.id))
      .innerJoin(ptSessionPackages, eq(ptSessionAttendance.packageId, ptSessionPackages.id))
      .where(eq(ptSessionAttendance.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      packageId: row.packageId,
      userId: row.userId,
      trainerId: row.trainerId,
      sessionDate: row.sessionDate,
      sessionNumber: row.sessionNumber,
      status: row.status,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
      notes: row.notes,
      adminConfirmed: row.adminConfirmed,
      confirmedBy: row.confirmedBy,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trainer: row.trainer,
      user: row.user,
      package: row.package,
    };
  }

  async updatePtSessionAttendance(id: string, attendanceData: Partial<InsertPtSessionAttendance>): Promise<void> {
    await db
      .update(ptSessionAttendance)
      .set({
        ...attendanceData,
        updatedAt: new Date(),
      })
      .where(eq(ptSessionAttendance.id, id));
  }

  async confirmPtSessionAttendance(id: string, adminId: string): Promise<void> {
    await db
      .update(ptSessionAttendance)
      .set({
        adminConfirmed: true,
        confirmedBy: adminId,
        confirmedAt: new Date(),
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(ptSessionAttendance.id, id));
  }

  // One-time QR code operations
  async generateOneTimeQrCode(userId: string): Promise<OneTimeQrCode> {
    const { randomUUID } = await import('crypto');
    const qrCode = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    const [newQrCode] = await db
      .insert(oneTimeQrCodes)
      .values({
        userId,
        qrCode,
        expiresAt,
        status: 'valid',
      })
      .returning();
    
    return newQrCode;
  }

  async validateOneTimeQrCode(qrCode: string): Promise<(OneTimeQrCode & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined> {
    const result = await db
      .select({
        id: oneTimeQrCodes.id,
        userId: oneTimeQrCodes.userId,
        qrCode: oneTimeQrCodes.qrCode,
        expiresAt: oneTimeQrCodes.expiresAt,
        usedAt: oneTimeQrCodes.usedAt,
        status: oneTimeQrCodes.status,
        createdAt: oneTimeQrCodes.createdAt,
        user: users,
        membershipId: memberships.id,
        membershipUserId: memberships.userId,
        membershipPlanId: memberships.planId,
        membershipStartDate: memberships.startDate,
        membershipEndDate: memberships.endDate,
        membershipStatus: memberships.status,
        membershipAutoRenewal: memberships.autoRenewal,
        membershipCreatedAt: memberships.createdAt,
        planId: membershipPlans.id,
        planName: membershipPlans.name,
        planDescription: membershipPlans.description,
        planPrice: membershipPlans.price,
        planDurationMonths: membershipPlans.durationMonths,
        planFeatures: membershipPlans.features,
        planStripePriceId: membershipPlans.stripePriceId,
        planActive: membershipPlans.active,
        planCreatedAt: membershipPlans.createdAt,
      })
      .from(oneTimeQrCodes)
      .innerJoin(users, eq(oneTimeQrCodes.userId, users.id))
      .leftJoin(memberships, and(eq(users.id, memberships.userId), eq(memberships.status, "active")))
      .leftJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(eq(oneTimeQrCodes.qrCode, qrCode))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      qrCode: row.qrCode,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      status: row.status,
      createdAt: row.createdAt,
      user: row.user,
      membership: row.membershipId ? {
        id: row.membershipId,
        userId: row.membershipUserId!,
        planId: row.membershipPlanId!,
        startDate: row.membershipStartDate!,
        endDate: row.membershipEndDate!,
        status: row.membershipStatus!,
        autoRenewal: row.membershipAutoRenewal!,
        createdAt: row.membershipCreatedAt!,
        plan: {
          id: row.planId!,
          name: row.planName!,
          description: row.planDescription,
          price: row.planPrice!,
          durationMonths: row.planDurationMonths!,
          features: row.planFeatures,
          stripePriceId: row.planStripePriceId,
          active: row.planActive!,
          createdAt: row.planCreatedAt!,
        }
      } : undefined
    };
  }

  async markQrCodeAsUsed(qrCode: string): Promise<void> {
    // Atomic update: only mark as used if status is still 'valid'
    // This prevents race conditions where two concurrent requests try to use the same QR
    const result = await db
      .update(oneTimeQrCodes)
      .set({
        status: 'used',
        usedAt: new Date(),
      })
      .where(and(
        eq(oneTimeQrCodes.qrCode, qrCode),
        eq(oneTimeQrCodes.status, 'valid')
      ))
      .returning();
    
    if (result.length === 0) {
      // Check if QR code exists and what its status is
      const existingQr = await db
        .select()
        .from(oneTimeQrCodes)
        .where(eq(oneTimeQrCodes.qrCode, qrCode))
        .limit(1);
      
      if (existingQr.length > 0) {
        console.error(`QR code ${qrCode} has status: ${existingQr[0].status}`);
      } else {
        console.error(`QR code ${qrCode} not found in database`);
      }
      
      throw new Error('QR code already used or invalid');
    }
  }

  async cleanupExpiredQrCodes(): Promise<number> {
    const now = new Date();
    
    // Mark expired QR codes
    const result = await db
      .update(oneTimeQrCodes)
      .set({ status: 'expired' })
      .where(and(
        eq(oneTimeQrCodes.status, 'valid'),
        lte(oneTimeQrCodes.expiresAt, now)
      ))
      .returning();
    
    return result.length;
  }

  // Password Reset operations
  async createPasswordResetToken(email: string, token: string): Promise<PasswordResetToken> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        email,
        token,
        expiresAt,
        status: 'valid',
      })
      .returning();
    
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    
    return resetToken;
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({
        status: 'used',
        usedAt: new Date(),
      })
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.status, 'valid')
      ));
  }

  async cleanupExpiredResetTokens(): Promise<number> {
    const now = new Date();
    
    const result = await db
      .update(passwordResetTokens)
      .set({ status: 'expired' })
      .where(and(
        eq(passwordResetTokens.status, 'valid'),
        lte(passwordResetTokens.expiresAt, now)
      ))
      .returning();
    
    return result.length;
  }

  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: newPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  async storeVerificationCode(email: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await db
      .update(users)
      .set({
        verificationCode: code,
        verificationCodeExpiry: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return false;
    if (!user.verificationCode) return false;
    if (user.verificationCode !== code) return false;
    if (!user.verificationCodeExpiry) return false;
    if (new Date() > user.verificationCodeExpiry) return false;

    // Mark email as verified and clear verification code
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    return true;
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    return userNotifications;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    
    return newNotification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
  }

  // Inactive member operations
  async getInactiveMembers(daysInactive: number): Promise<(User & { membership: Membership & { plan: MembershipPlan } })[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const usersWithMemberships = await db
      .select({
        user: users,
        membership: memberships,
        plan: membershipPlans,
      })
      .from(users)
      .innerJoin(memberships, eq(users.id, memberships.userId))
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(and(
        eq(memberships.status, 'active'),
        eq(users.active, true)
      ));

    const inactiveMembers: (User & { membership: Membership & { plan: MembershipPlan } })[] = [];

    for (const item of usersWithMemberships) {
      const [recentCheckIn] = await db
        .select()
        .from(checkIns)
        .where(and(
          eq(checkIns.userId, item.user.id),
          gte(checkIns.checkInTime, cutoffDate)
        ))
        .limit(1);

      if (!recentCheckIn) {
        inactiveMembers.push({
          ...item.user,
          membership: {
            ...item.membership,
            plan: item.plan
          }
        });
      }
    }

    return inactiveMembers;
  }

  async sendInactivityReminders(daysInactive: number): Promise<number> {
    const inactiveMembers = await this.getInactiveMembers(daysInactive);
    let reminderCount = 0;

    for (const member of inactiveMembers) {
      await this.createNotification({
        userId: member.id,
        title: 'Ayo Ngegym Lagi! 💪',
        message: `Sudah ${daysInactive} hari kamu tidak ngegym. Yuk, lanjutkan perjalanan fitness kamu!`,
        type: 'inactivity_reminder',
        relatedId: member.membership.id,
      });
      reminderCount++;
    }

    return reminderCount;
  }
}

export const storage = new DatabaseStorage();
