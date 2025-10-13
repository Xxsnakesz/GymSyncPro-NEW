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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, lte, and, count, sum } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  
  // Membership operations
  getMembershipPlans(): Promise<MembershipPlan[]>;
  createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan>;
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
  cancelClassBooking(id: string): Promise<void>;
  
  // Check-in operations
  getUserCheckIns(userId: string, limit?: number): Promise<CheckIn[]>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;
  updateCheckOut(id: string): Promise<void>;
  getCurrentCrowdCount(): Promise<number>;
  validateCheckInQR(qrCode: string): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } }) | undefined>;
  getRecentCheckIns(limit?: number): Promise<(CheckIn & { user: User; membership?: Membership & { plan: MembershipPlan } })[]>;
  autoCheckoutExpiredSessions(): Promise<number>;
  
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

  // Membership operations
  async getMembershipPlans(): Promise<MembershipPlan[]> {
    return await db.select().from(membershipPlans).where(eq(membershipPlans.active, true));
  }

  async createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan> {
    const [newPlan] = await db.insert(membershipPlans).values(plan).returning();
    return newPlan;
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
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
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
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      profileImageUrl: row.profileImageUrl,
      role: row.role,
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
}

export const storage = new DatabaseStorage();
