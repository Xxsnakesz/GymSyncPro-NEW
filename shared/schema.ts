import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  permanentQrCode: varchar("permanent_qr_code"),
  role: varchar("role").default("member"), // member, admin
  active: boolean("active").default(true), // true = active, false = suspended
  emailVerified: boolean("email_verified").default(false),
  verificationCode: varchar("verification_code"),
  verificationCodeExpiry: timestamp("verification_code_expiry"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Membership plans
export const membershipPlans = pgTable("membership_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationMonths: integer("duration_months").notNull(),
  features: jsonb("features"),
  stripePriceId: varchar("stripe_price_id"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User memberships
export const memberships = pgTable("memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull().references(() => membershipPlans.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status").default("active"), // active, expired, cancelled
  autoRenewal: boolean("auto_renewal").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gym classes
export const gymClasses = pgTable("gym_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  instructorName: varchar("instructor_name").notNull(),
  schedule: varchar("schedule").notNull(), // e.g., "Mon, Wed, Fri - 7:00 AM"
  maxCapacity: integer("max_capacity").notNull(),
  currentEnrollment: integer("current_enrollment").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Class bookings
export const classBookings = pgTable("class_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  classId: varchar("class_id").notNull().references(() => gymClasses.id),
  bookingDate: timestamp("booking_date").notNull(),
  status: varchar("status").default("booked"), // booked, attended, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Check-ins
export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  checkInTime: timestamp("check_in_time").defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  qrCode: varchar("qr_code").notNull(),
  lockerNumber: varchar("locker_number"),
  status: varchar("status").default("active"), // active, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  membershipId: varchar("membership_id").references(() => memberships.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("usd"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  status: varchar("status").notNull(), // pending, completed, failed, refunded
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback
export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  rating: integer("rating"), // 1-5 stars
  status: varchar("status").default("pending"), // pending, reviewed, resolved
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Personal Trainers
export const personalTrainers = pgTable("personal_trainers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  bio: text("bio"),
  specialization: varchar("specialization").notNull(),
  experience: integer("experience"), // years of experience
  certification: text("certification"),
  imageUrl: varchar("image_url"),
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(),
  availability: jsonb("availability"), // Store available days/times
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PT Bookings
export const ptBookings = pgTable("pt_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  trainerId: varchar("trainer_id").notNull().references(() => personalTrainers.id),
  bookingDate: timestamp("booking_date").notNull(),
  duration: integer("duration").default(60), // minutes
  sessionCount: integer("session_count").notNull().default(1), // number of sessions
  status: varchar("status").default("pending"), // pending, confirmed, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PT Session Packages (member buys X sessions)
export const ptSessionPackages = pgTable("pt_session_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  trainerId: varchar("trainer_id").notNull().references(() => personalTrainers.id),
  totalSessions: integer("total_sessions").notNull(), // total sessions bought
  usedSessions: integer("used_sessions").default(0), // sessions used/attended
  remainingSessions: integer("remaining_sessions").notNull(), // sessions left
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("active"), // active, completed, expired
  purchaseDate: timestamp("purchase_date").defaultNow(),
  expiryDate: timestamp("expiry_date"), // optional expiry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PT Session Attendance (tracks each session)
export const ptSessionAttendance = pgTable("pt_session_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => ptSessionPackages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  trainerId: varchar("trainer_id").notNull().references(() => personalTrainers.id),
  sessionDate: timestamp("session_date").notNull(),
  sessionNumber: integer("session_number").notNull(), // which session (1, 2, 3, etc.)
  status: varchar("status").default("scheduled"), // scheduled, completed, cancelled, no_show
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  notes: text("notes"),
  adminConfirmed: boolean("admin_confirmed").default(false),
  confirmedBy: varchar("confirmed_by"), // admin user id
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// One-time QR codes for check-in
export const oneTimeQrCodes = pgTable("one_time_qr_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  qrCode: varchar("qr_code").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: varchar("status").default("valid"), // valid, used, expired
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: varchar("status").default("valid"), // valid, used, expired
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // booking_confirmed, booking_cancelled, membership_expiring, etc.
  relatedId: varchar("related_id"), // ID of related booking, membership, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Promotions (admin-managed, shown to members)
export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  cta: varchar("cta"),
  ctaHref: varchar("cta_href"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  classBookings: many(classBookings),
  checkIns: many(checkIns),
  payments: many(payments),
  feedbacks: many(feedbacks),
  ptBookings: many(ptBookings),
  ptSessionPackages: many(ptSessionPackages),
  ptSessionAttendance: many(ptSessionAttendance),
  oneTimeQrCodes: many(oneTimeQrCodes),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
}));

export const membershipPlansRelations = relations(membershipPlans, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  plan: one(membershipPlans, {
    fields: [memberships.planId],
    references: [membershipPlans.id],
  }),
  payments: many(payments),
}));

export const gymClassesRelations = relations(gymClasses, ({ many }) => ({
  bookings: many(classBookings),
}));

export const classBookingsRelations = relations(classBookings, ({ one }) => ({
  user: one(users, {
    fields: [classBookings.userId],
    references: [users.id],
  }),
  gymClass: one(gymClasses, {
    fields: [classBookings.classId],
    references: [gymClasses.id],
  }),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  user: one(users, {
    fields: [checkIns.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  membership: one(memberships, {
    fields: [payments.membershipId],
    references: [memberships.id],
  }),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  user: one(users, {
    fields: [feedbacks.userId],
    references: [users.id],
  }),
}));

export const personalTrainersRelations = relations(personalTrainers, ({ many }) => ({
  bookings: many(ptBookings),
  sessionPackages: many(ptSessionPackages),
  sessionAttendance: many(ptSessionAttendance),
}));

export const ptBookingsRelations = relations(ptBookings, ({ one }) => ({
  user: one(users, {
    fields: [ptBookings.userId],
    references: [users.id],
  }),
  trainer: one(personalTrainers, {
    fields: [ptBookings.trainerId],
    references: [personalTrainers.id],
  }),
}));

export const ptSessionPackagesRelations = relations(ptSessionPackages, ({ one, many }) => ({
  user: one(users, {
    fields: [ptSessionPackages.userId],
    references: [users.id],
  }),
  trainer: one(personalTrainers, {
    fields: [ptSessionPackages.trainerId],
    references: [personalTrainers.id],
  }),
  sessions: many(ptSessionAttendance),
}));

export const ptSessionAttendanceRelations = relations(ptSessionAttendance, ({ one }) => ({
  package: one(ptSessionPackages, {
    fields: [ptSessionAttendance.packageId],
    references: [ptSessionPackages.id],
  }),
  user: one(users, {
    fields: [ptSessionAttendance.userId],
    references: [users.id],
  }),
  trainer: one(personalTrainers, {
    fields: [ptSessionAttendance.trainerId],
    references: [personalTrainers.id],
  }),
}));

export const oneTimeQrCodesRelations = relations(oneTimeQrCodes, ({ one }) => ({
  user: one(users, {
    fields: [oneTimeQrCodes.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.email],
    references: [users.email],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

// No complex relations needed for promotions currently

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Register schema with validation
export const registerSchema = insertUserSchema.omit({
  role: true,
  active: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  profileImageUrl: true,
  emailVerified: true,
  verificationCode: true,
  verificationCodeExpiry: true,
  permanentQrCode: true,
}).extend({
  email: z.string().email("Email tidak valid").refine((email) => email.toLowerCase().endsWith("@gmail.com"), {
    message: "Email harus menggunakan Gmail (@gmail.com)",
  }),
  phone: z.string().regex(/^[0-9]{9,12}$/, "Nomor telepon harus 9-12 digit angka"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string(),
  selfieImage: z.string().min(1, "Foto selfie wajib diambil"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username diperlukan"),
  password: z.string().min(1, "Password diperlukan"),
  rememberMe: z.boolean().optional().default(false),
});

export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({
  id: true,
  createdAt: true,
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
});

export const insertGymClassSchema = createInsertSchema(gymClasses).omit({
  id: true,
  createdAt: true,
});

export const insertClassBookingSchema = createInsertSchema(classBookings).omit({
  id: true,
  createdAt: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalTrainerSchema = createInsertSchema(personalTrainers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPtBookingSchema = createInsertSchema(ptBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPtSessionPackageSchema = createInsertSchema(ptSessionPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPtSessionAttendanceSchema = createInsertSchema(ptSessionAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOneTimeQrCodeSchema = createInsertSchema(oneTimeQrCodes).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Forgot password schemas
export const forgotPasswordRequestSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token diperlukan"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

// Email verification schema
export const verifyEmailSchema = z.object({
  email: z.string().email("Email tidak valid"),
  verificationCode: z.string().length(6, "Kode verifikasi harus 6 digit"),
});

// Cookie Preferences Schema
export const cookiePreferencesSchema = z.object({
  necessary: z.boolean().default(true),
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  preferences: z.boolean().default(false),
  consentGiven: z.boolean().default(false),
  consentDate: z.string().optional(),
});

export const cookieSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['id', 'en']).default('id'),
  sidebarState: z.enum(['expanded', 'collapsed']).default('expanded'),
  notificationsEnabled: z.boolean().default(true),
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type GymClass = typeof gymClasses.$inferSelect;
export type InsertGymClass = z.infer<typeof insertGymClassSchema>;
export type ClassBooking = typeof classBookings.$inferSelect;
export type InsertClassBooking = z.infer<typeof insertClassBookingSchema>;
export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type PersonalTrainer = typeof personalTrainers.$inferSelect;
export type InsertPersonalTrainer = z.infer<typeof insertPersonalTrainerSchema>;
export type PtBooking = typeof ptBookings.$inferSelect;
export type InsertPtBooking = z.infer<typeof insertPtBookingSchema>;
export type PtSessionPackage = typeof ptSessionPackages.$inferSelect;
export type InsertPtSessionPackage = z.infer<typeof insertPtSessionPackageSchema>;
export type PtSessionAttendance = typeof ptSessionAttendance.$inferSelect;
export type InsertPtSessionAttendance = z.infer<typeof insertPtSessionAttendanceSchema>;
export type OneTimeQrCode = typeof oneTimeQrCodes.$inferSelect;
export type InsertOneTimeQrCode = z.infer<typeof insertOneTimeQrCodeSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type CookiePreferences = z.infer<typeof cookiePreferencesSchema>;
export type CookieSettings = z.infer<typeof cookieSettingsSchema>;
