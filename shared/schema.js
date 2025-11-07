"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertNotificationSchema = exports.insertPasswordResetTokenSchema = exports.insertOneTimeQrCodeSchema = exports.insertPtSessionAttendanceSchema = exports.insertPtSessionPackageSchema = exports.insertPtBookingSchema = exports.insertPersonalTrainerSchema = exports.insertFeedbackSchema = exports.insertPaymentSchema = exports.insertCheckInSchema = exports.insertClassBookingSchema = exports.insertGymClassSchema = exports.insertMembershipSchema = exports.insertMembershipPlanSchema = exports.loginSchema = exports.registerSchema = exports.insertUserSchema = exports.pushSubscriptionsRelations = exports.notificationsRelations = exports.passwordResetTokensRelations = exports.oneTimeQrCodesRelations = exports.ptSessionAttendanceRelations = exports.ptSessionPackagesRelations = exports.ptBookingsRelations = exports.personalTrainersRelations = exports.feedbacksRelations = exports.paymentsRelations = exports.checkInsRelations = exports.classBookingsRelations = exports.gymClassesRelations = exports.membershipsRelations = exports.membershipPlansRelations = exports.usersRelations = exports.pushSubscriptions = exports.notifications = exports.passwordResetTokens = exports.oneTimeQrCodes = exports.ptSessionAttendance = exports.ptSessionPackages = exports.ptBookings = exports.personalTrainers = exports.feedbacks = exports.payments = exports.checkIns = exports.classBookings = exports.gymClasses = exports.memberships = exports.membershipPlans = exports.users = exports.sessions = void 0;
exports.cookieSettingsSchema = exports.cookiePreferencesSchema = exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordRequestSchema = exports.insertPushSubscriptionSchema = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_2 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Session storage table.
exports.sessions = (0, pg_core_1.pgTable)("sessions", {
    sid: (0, pg_core_1.varchar)("sid").primaryKey(),
    sess: (0, pg_core_1.jsonb)("sess").notNull(),
    expire: (0, pg_core_1.timestamp)("expire").notNull(),
}, (table) => [(0, pg_core_1.index)("IDX_session_expire").on(table.expire)]);
// User storage table.
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    username: (0, pg_core_1.varchar)("username").unique().notNull(),
    password: (0, pg_core_1.varchar)("password").notNull(),
    email: (0, pg_core_1.varchar)("email").unique().notNull(),
    firstName: (0, pg_core_1.varchar)("first_name").notNull(),
    lastName: (0, pg_core_1.varchar)("last_name").notNull(),
    phone: (0, pg_core_1.varchar)("phone"),
    profileImageUrl: (0, pg_core_1.varchar)("profile_image_url"),
    permanentQrCode: (0, pg_core_1.varchar)("permanent_qr_code"),
    role: (0, pg_core_1.varchar)("role").default("member"), // member, admin
    active: (0, pg_core_1.boolean)("active").default(true), // true = active, false = suspended
    emailVerified: (0, pg_core_1.boolean)("email_verified").default(false),
    verificationCode: (0, pg_core_1.varchar)("verification_code"),
    verificationCodeExpiry: (0, pg_core_1.timestamp)("verification_code_expiry"),
    stripeCustomerId: (0, pg_core_1.varchar)("stripe_customer_id"),
    stripeSubscriptionId: (0, pg_core_1.varchar)("stripe_subscription_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Membership plans
exports.membershipPlans = (0, pg_core_1.pgTable)("membership_plans", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    durationMonths: (0, pg_core_1.integer)("duration_months").notNull(),
    features: (0, pg_core_1.jsonb)("features"),
    stripePriceId: (0, pg_core_1.varchar)("stripe_price_id"),
    active: (0, pg_core_1.boolean)("active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// User memberships
exports.memberships = (0, pg_core_1.pgTable)("memberships", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    planId: (0, pg_core_1.varchar)("plan_id").notNull().references(() => exports.membershipPlans.id),
    startDate: (0, pg_core_1.timestamp)("start_date").notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date").notNull(),
    status: (0, pg_core_1.varchar)("status").default("active"), // active, expired, cancelled
    autoRenewal: (0, pg_core_1.boolean)("auto_renewal").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Gym classes
exports.gymClasses = (0, pg_core_1.pgTable)("gym_classes", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    instructorName: (0, pg_core_1.varchar)("instructor_name").notNull(),
    schedule: (0, pg_core_1.varchar)("schedule").notNull(), // e.g., "Mon, Wed, Fri - 7:00 AM"
    maxCapacity: (0, pg_core_1.integer)("max_capacity").notNull(),
    currentEnrollment: (0, pg_core_1.integer)("current_enrollment").default(0),
    active: (0, pg_core_1.boolean)("active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Class bookings
exports.classBookings = (0, pg_core_1.pgTable)("class_bookings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    classId: (0, pg_core_1.varchar)("class_id").notNull().references(() => exports.gymClasses.id),
    bookingDate: (0, pg_core_1.timestamp)("booking_date").notNull(),
    status: (0, pg_core_1.varchar)("status").default("booked"), // booked, attended, cancelled
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Check-ins
exports.checkIns = (0, pg_core_1.pgTable)("check_ins", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    checkInTime: (0, pg_core_1.timestamp)("check_in_time").defaultNow(),
    checkOutTime: (0, pg_core_1.timestamp)("check_out_time"),
    qrCode: (0, pg_core_1.varchar)("qr_code").notNull(),
    status: (0, pg_core_1.varchar)("status").default("active"), // active, completed
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Payments
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    membershipId: (0, pg_core_1.varchar)("membership_id").references(() => exports.memberships.id),
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency").default("usd"),
    stripePaymentIntentId: (0, pg_core_1.varchar)("stripe_payment_intent_id"),
    status: (0, pg_core_1.varchar)("status").notNull(), // pending, completed, failed, refunded
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Feedback
exports.feedbacks = (0, pg_core_1.pgTable)("feedbacks", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    subject: (0, pg_core_1.varchar)("subject").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    rating: (0, pg_core_1.integer)("rating"), // 1-5 stars
    status: (0, pg_core_1.varchar)("status").default("pending"), // pending, reviewed, resolved
    adminResponse: (0, pg_core_1.text)("admin_response"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Personal Trainers
exports.personalTrainers = (0, pg_core_1.pgTable)("personal_trainers", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name").notNull(),
    bio: (0, pg_core_1.text)("bio"),
    specialization: (0, pg_core_1.varchar)("specialization").notNull(),
    experience: (0, pg_core_1.integer)("experience"), // years of experience
    certification: (0, pg_core_1.text)("certification"),
    imageUrl: (0, pg_core_1.varchar)("image_url"),
    pricePerSession: (0, pg_core_1.decimal)("price_per_session", { precision: 10, scale: 2 }).notNull(),
    availability: (0, pg_core_1.jsonb)("availability"), // Store available days/times
    active: (0, pg_core_1.boolean)("active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// PT Bookings
exports.ptBookings = (0, pg_core_1.pgTable)("pt_bookings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    trainerId: (0, pg_core_1.varchar)("trainer_id").notNull().references(() => exports.personalTrainers.id),
    bookingDate: (0, pg_core_1.timestamp)("booking_date").notNull(),
    duration: (0, pg_core_1.integer)("duration").default(60), // minutes
    sessionCount: (0, pg_core_1.integer)("session_count").notNull().default(1), // number of sessions
    status: (0, pg_core_1.varchar)("status").default("pending"), // pending, confirmed, completed, cancelled
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// PT Session Packages (member buys X sessions)
exports.ptSessionPackages = (0, pg_core_1.pgTable)("pt_session_packages", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    trainerId: (0, pg_core_1.varchar)("trainer_id").notNull().references(() => exports.personalTrainers.id),
    totalSessions: (0, pg_core_1.integer)("total_sessions").notNull(), // total sessions bought
    usedSessions: (0, pg_core_1.integer)("used_sessions").default(0), // sessions used/attended
    remainingSessions: (0, pg_core_1.integer)("remaining_sessions").notNull(), // sessions left
    pricePerSession: (0, pg_core_1.decimal)("price_per_session", { precision: 10, scale: 2 }).notNull(),
    totalPrice: (0, pg_core_1.decimal)("total_price", { precision: 10, scale: 2 }).notNull(),
    status: (0, pg_core_1.varchar)("status").default("active"), // active, completed, expired
    purchaseDate: (0, pg_core_1.timestamp)("purchase_date").defaultNow(),
    expiryDate: (0, pg_core_1.timestamp)("expiry_date"), // optional expiry
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// PT Session Attendance (tracks each session)
exports.ptSessionAttendance = (0, pg_core_1.pgTable)("pt_session_attendance", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    packageId: (0, pg_core_1.varchar)("package_id").notNull().references(() => exports.ptSessionPackages.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    trainerId: (0, pg_core_1.varchar)("trainer_id").notNull().references(() => exports.personalTrainers.id),
    sessionDate: (0, pg_core_1.timestamp)("session_date").notNull(),
    sessionNumber: (0, pg_core_1.integer)("session_number").notNull(), // which session (1, 2, 3, etc.)
    status: (0, pg_core_1.varchar)("status").default("scheduled"), // scheduled, completed, cancelled, no_show
    checkInTime: (0, pg_core_1.timestamp)("check_in_time"),
    checkOutTime: (0, pg_core_1.timestamp)("check_out_time"),
    notes: (0, pg_core_1.text)("notes"),
    adminConfirmed: (0, pg_core_1.boolean)("admin_confirmed").default(false),
    confirmedBy: (0, pg_core_1.varchar)("confirmed_by"), // admin user id
    confirmedAt: (0, pg_core_1.timestamp)("confirmed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// One-time QR codes for check-in
exports.oneTimeQrCodes = (0, pg_core_1.pgTable)("one_time_qr_codes", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    qrCode: (0, pg_core_1.varchar)("qr_code").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    usedAt: (0, pg_core_1.timestamp)("used_at"),
    status: (0, pg_core_1.varchar)("status").default("valid"), // valid, used, expired
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Password reset tokens
exports.passwordResetTokens = (0, pg_core_1.pgTable)("password_reset_tokens", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    email: (0, pg_core_1.varchar)("email").notNull(),
    token: (0, pg_core_1.varchar)("token").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    usedAt: (0, pg_core_1.timestamp)("used_at"),
    status: (0, pg_core_1.varchar)("status").default("valid"), // valid, used, expired
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Notifications
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    title: (0, pg_core_1.varchar)("title").notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    type: (0, pg_core_1.varchar)("type").notNull(), // booking_confirmed, booking_cancelled, membership_expiring, etc.
    relatedId: (0, pg_core_1.varchar)("related_id"), // ID of related booking, membership, etc.
    isRead: (0, pg_core_1.boolean)("is_read").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Push Subscriptions
exports.pushSubscriptions = (0, pg_core_1.pgTable)("push_subscriptions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    endpoint: (0, pg_core_1.text)("endpoint").notNull().unique(),
    p256dh: (0, pg_core_1.text)("p256dh").notNull(),
    auth: (0, pg_core_1.text)("auth").notNull(),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
// Relations
exports.usersRelations = (0, drizzle_orm_2.relations)(exports.users, ({ many }) => ({
    memberships: many(exports.memberships),
    classBookings: many(exports.classBookings),
    checkIns: many(exports.checkIns),
    payments: many(exports.payments),
    feedbacks: many(exports.feedbacks),
    ptBookings: many(exports.ptBookings),
    ptSessionPackages: many(exports.ptSessionPackages),
    ptSessionAttendance: many(exports.ptSessionAttendance),
    oneTimeQrCodes: many(exports.oneTimeQrCodes),
    notifications: many(exports.notifications),
    pushSubscriptions: many(exports.pushSubscriptions),
}));
exports.membershipPlansRelations = (0, drizzle_orm_2.relations)(exports.membershipPlans, ({ many }) => ({
    memberships: many(exports.memberships),
}));
exports.membershipsRelations = (0, drizzle_orm_2.relations)(exports.memberships, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.memberships.userId],
        references: [exports.users.id],
    }),
    plan: one(exports.membershipPlans, {
        fields: [exports.memberships.planId],
        references: [exports.membershipPlans.id],
    }),
    payments: many(exports.payments),
}));
exports.gymClassesRelations = (0, drizzle_orm_2.relations)(exports.gymClasses, ({ many }) => ({
    bookings: many(exports.classBookings),
}));
exports.classBookingsRelations = (0, drizzle_orm_2.relations)(exports.classBookings, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.classBookings.userId],
        references: [exports.users.id],
    }),
    gymClass: one(exports.gymClasses, {
        fields: [exports.classBookings.classId],
        references: [exports.gymClasses.id],
    }),
}));
exports.checkInsRelations = (0, drizzle_orm_2.relations)(exports.checkIns, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.checkIns.userId],
        references: [exports.users.id],
    }),
}));
exports.paymentsRelations = (0, drizzle_orm_2.relations)(exports.payments, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.payments.userId],
        references: [exports.users.id],
    }),
    membership: one(exports.memberships, {
        fields: [exports.payments.membershipId],
        references: [exports.memberships.id],
    }),
}));
exports.feedbacksRelations = (0, drizzle_orm_2.relations)(exports.feedbacks, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.feedbacks.userId],
        references: [exports.users.id],
    }),
}));
exports.personalTrainersRelations = (0, drizzle_orm_2.relations)(exports.personalTrainers, ({ many }) => ({
    bookings: many(exports.ptBookings),
    sessionPackages: many(exports.ptSessionPackages),
    sessionAttendance: many(exports.ptSessionAttendance),
}));
exports.ptBookingsRelations = (0, drizzle_orm_2.relations)(exports.ptBookings, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.ptBookings.userId],
        references: [exports.users.id],
    }),
    trainer: one(exports.personalTrainers, {
        fields: [exports.ptBookings.trainerId],
        references: [exports.personalTrainers.id],
    }),
}));
exports.ptSessionPackagesRelations = (0, drizzle_orm_2.relations)(exports.ptSessionPackages, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.ptSessionPackages.userId],
        references: [exports.users.id],
    }),
    trainer: one(exports.personalTrainers, {
        fields: [exports.ptSessionPackages.trainerId],
        references: [exports.personalTrainers.id],
    }),
    sessions: many(exports.ptSessionAttendance),
}));
exports.ptSessionAttendanceRelations = (0, drizzle_orm_2.relations)(exports.ptSessionAttendance, ({ one }) => ({
    package: one(exports.ptSessionPackages, {
        fields: [exports.ptSessionAttendance.packageId],
        references: [exports.ptSessionPackages.id],
    }),
    user: one(exports.users, {
        fields: [exports.ptSessionAttendance.userId],
        references: [exports.users.id],
    }),
    trainer: one(exports.personalTrainers, {
        fields: [exports.ptSessionAttendance.trainerId],
        references: [exports.personalTrainers.id],
    }),
}));
exports.oneTimeQrCodesRelations = (0, drizzle_orm_2.relations)(exports.oneTimeQrCodes, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.oneTimeQrCodes.userId],
        references: [exports.users.id],
    }),
}));
exports.passwordResetTokensRelations = (0, drizzle_orm_2.relations)(exports.passwordResetTokens, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.passwordResetTokens.email],
        references: [exports.users.email],
    }),
}));
exports.notificationsRelations = (0, drizzle_orm_2.relations)(exports.notifications, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.notifications.userId],
        references: [exports.users.id],
    }),
}));
exports.pushSubscriptionsRelations = (0, drizzle_orm_2.relations)(exports.pushSubscriptions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.pushSubscriptions.userId],
        references: [exports.users.id],
    }),
}));
// Insert schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Register schema with validation
exports.registerSchema = exports.insertUserSchema.omit({
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
    email: zod_1.z.string().email("Email tidak valid").refine((email) => email.toLowerCase().endsWith("@gmail.com"), {
        message: "Email harus menggunakan Gmail (@gmail.com)",
    }),
    phone: zod_1.z.string().regex(/^[0-9]{9,12}$/, "Nomor telepon harus 9-12 digit angka"),
    password: zod_1.z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: zod_1.z.string(),
    selfieImage: zod_1.z.string().min(1, "Foto selfie wajib diambil"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
});
// Login schema
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username diperlukan"),
    password: zod_1.z.string().min(1, "Password diperlukan"),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
exports.insertMembershipPlanSchema = (0, drizzle_zod_1.createInsertSchema)(exports.membershipPlans).omit({
    id: true,
    createdAt: true,
});
exports.insertMembershipSchema = (0, drizzle_zod_1.createInsertSchema)(exports.memberships).omit({
    id: true,
    createdAt: true,
});
exports.insertGymClassSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gymClasses).omit({
    id: true,
    createdAt: true,
});
exports.insertClassBookingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.classBookings).omit({
    id: true,
    createdAt: true,
});
exports.insertCheckInSchema = (0, drizzle_zod_1.createInsertSchema)(exports.checkIns).omit({
    id: true,
    createdAt: true,
});
exports.insertPaymentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.payments).omit({
    id: true,
    createdAt: true,
});
exports.insertFeedbackSchema = (0, drizzle_zod_1.createInsertSchema)(exports.feedbacks).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertPersonalTrainerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.personalTrainers).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertPtBookingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.ptBookings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertPtSessionPackageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.ptSessionPackages).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertPtSessionAttendanceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.ptSessionAttendance).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertOneTimeQrCodeSchema = (0, drizzle_zod_1.createInsertSchema)(exports.oneTimeQrCodes).omit({
    id: true,
    createdAt: true,
});
exports.insertPasswordResetTokenSchema = (0, drizzle_zod_1.createInsertSchema)(exports.passwordResetTokens).omit({
    id: true,
    createdAt: true,
});
exports.insertNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notifications).omit({
    id: true,
    createdAt: true,
});
exports.insertPushSubscriptionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.pushSubscriptions).omit({
    id: true,
    createdAt: true,
});
// Forgot password schemas
exports.forgotPasswordRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email tidak valid"),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token diperlukan"),
    newPassword: zod_1.z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
});
// Email verification schema
exports.verifyEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email tidak valid"),
    verificationCode: zod_1.z.string().length(6, "Kode verifikasi harus 6 digit"),
});
// Cookie Preferences Schema
exports.cookiePreferencesSchema = zod_1.z.object({
    necessary: zod_1.z.boolean().default(true),
    analytics: zod_1.z.boolean().default(false),
    marketing: zod_1.z.boolean().default(false),
    preferences: zod_1.z.boolean().default(false),
    consentGiven: zod_1.z.boolean().default(false),
    consentDate: zod_1.z.string().optional(),
});
exports.cookieSettingsSchema = zod_1.z.object({
    theme: zod_1.z.enum(['light', 'dark', 'system']).default('system'),
    language: zod_1.z.enum(['id', 'en']).default('id'),
    sidebarState: zod_1.z.enum(['expanded', 'collapsed']).default('expanded'),
    notificationsEnabled: zod_1.z.boolean().default(true),
});
