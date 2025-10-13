import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import * as midtransClient from 'midtrans-client';
import passport from "passport";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { insertMembershipPlanSchema, insertGymClassSchema, insertClassBookingSchema, insertCheckInSchema, insertPaymentSchema, registerSchema, loginSchema, forgotPasswordRequestSchema, resetPasswordSchema } from "@shared/schema";
import { sendPasswordResetEmail } from "./email/resend";
import { z } from "zod";
import { randomUUID } from "crypto";

// Make Stripe optional - can be added later
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
}

// Indonesian Payment Gateway - Midtrans
let midtransCore: any = null;
let midtransSnap: any = null;

if (process.env.MIDTRANS_SERVER_KEY) {
  const isProduction = process.env.MIDTRANS_ENVIRONMENT === 'production';
  
  midtransCore = new midtransClient.CoreApi({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  });
  
  midtransSnap = new midtransClient.Snap({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register route
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        password: hashedPassword,
        role: 'member',
      });

      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        res.json({ message: "Registration successful", user: { ...user, password: undefined } });
      });
    } catch (error: any) {
      console.error("Error during registration:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  // Admin registration route (special endpoint with secret key)
  app.post('/api/register-admin', async (req, res) => {
    try {
      const { adminSecretKey, ...userData } = req.body;
      
      console.log("Admin registration attempt:", { username: userData.username, email: userData.email });
      
      // Check for admin secret key (you can set this in environment variables)
      // For now, we'll allow if the key is "admin123" or if ADMIN_SECRET_KEY env var matches
      const validSecretKey = process.env.ADMIN_SECRET_KEY || "admin123";
      
      if (adminSecretKey !== validSecretKey) {
        console.log("Invalid admin secret key provided");
        return res.status(403).json({ message: "Invalid admin secret key" });
      }
      
      // Validate data
      const validatedData = registerSchema.parse(userData);
      console.log("Data validated successfully");
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        console.log("Username already exists:", validatedData.username);
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        console.log("Email already exists:", validatedData.email);
        return res.status(400).json({ message: "Email sudah digunakan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      console.log("Password hashed successfully");

      // Create admin user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone || undefined,
        password: hashedPassword,
        role: 'admin', // Set role to admin
      });

      console.log("Admin user created successfully:", user.id);

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error("Failed to login after admin registration:", err);
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        console.log("Admin logged in successfully");
        res.json({ message: "Admin registration successful", user: { ...user, password: undefined } });
      });
    } catch (error: any) {
      console.error("Error during admin registration:", error);
      res.status(400).json({ message: error.message || "Admin registration failed" });
    }
  });

  // Login route
  app.post('/api/login', (req, res, next) => {
    const { rememberMe } = req.body;
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        
        // Extend session if remember me is checked
        if (rememberMe && req.session.cookie) {
          // Set cookie to expire in 30 days instead of default session lifetime
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        }
        
        res.json({ message: "Login successful", user: { ...user, password: undefined } });
      });
    })(req, res, next);
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Forgot Password route
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordRequestSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "Jika email terdaftar, kode verifikasi telah dikirim" });
      }

      // Generate 6-digit verification code
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store token in database
      await storage.createPasswordResetToken(validatedData.email, resetToken);
      
      // Send email
      await sendPasswordResetEmail(validatedData.email, resetToken);
      
      res.json({ message: "Kode verifikasi telah dikirim ke email Anda" });
    } catch (error: any) {
      console.error("Error in forgot password:", error);
      res.status(400).json({ message: error.message || "Gagal mengirim kode verifikasi" });
    }
  });

  // Reset Password route
  app.post('/api/reset-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Validate token
      const resetToken = await storage.getPasswordResetToken(validatedData.token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Kode verifikasi tidak valid" });
      }
      
      if (resetToken.status !== 'valid') {
        return res.status(400).json({ message: "Kode verifikasi sudah digunakan atau kadaluarsa" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        await storage.markTokenAsUsed(validatedData.token);
        return res.status(400).json({ message: "Kode verifikasi sudah kadaluarsa" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);
      
      // Update password
      await storage.updateUserPassword(resetToken.email, hashedPassword);
      
      // Mark token as used
      await storage.markTokenAsUsed(validatedData.token);
      
      res.json({ message: "Password berhasil direset. Silakan login dengan password baru Anda" });
    } catch (error: any) {
      console.error("Error in reset password:", error);
      res.status(400).json({ message: error.message || "Gagal mereset password" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json({ ...req.user, password: undefined });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Member routes
  app.get('/api/member/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const [membership, checkIns, classBookings, payments, crowdCount] = await Promise.all([
        storage.getUserMembership(userId),
        storage.getUserCheckIns(userId, 10),
        storage.getUserClassBookings(userId),
        storage.getUserPayments(userId),
        storage.getCurrentCrowdCount(),
      ]);

      // Calculate stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCheckIns = checkIns.filter(checkIn => checkIn.checkInTime && checkIn.checkInTime >= thisMonth).length;
      
      const upcomingClasses = classBookings.filter(booking => 
        booking.status === 'booked' && booking.bookingDate > now
      );

      res.json({
        membership,
        checkIns,
        classBookings: upcomingClasses,
        payments: payments.slice(0, 5), // Recent payments
        stats: {
          monthlyCheckIns,
          upcomingClasses: upcomingClasses.length,
          currentCrowd: crowdCount,
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Check-in routes
  app.post('/api/checkin/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user is suspended
      const user = await storage.getUser(userId);
      if (user?.active === false) {
        return res.status(403).json({ 
          message: "Akun Anda sedang dinonaktifkan. Silakan hubungi admin untuk informasi lebih lanjut." 
        });
      }
      
      // Generate one-time QR code with 5 minutes expiry
      const oneTimeQr = await storage.generateOneTimeQrCode(userId);
      
      // Get membership info
      const membership = await storage.getUserMembership(userId);
      
      // Check if membership is active
      const hasActiveMembership = !!(membership && new Date(membership.endDate) > new Date());

      res.json({ 
        qrCode: oneTimeQr.qrCode,
        expiresAt: oneTimeQr.expiresAt,
        membership,
        hasActiveMembership 
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.post('/api/checkin/:id/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.updateCheckOut(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error checking out:", error);
      res.status(500).json({ message: "Failed to check out" });
    }
  });

  // Check QR code status (for polling)
  app.get('/api/checkin/status/:qrCode', async (req, res) => {
    try {
      const { qrCode } = req.params;
      
      if (!qrCode) {
        return res.status(400).json({ success: false, message: 'QR code is required' });
      }

      // Check one-time QR code status
      const qrData = await storage.validateOneTimeQrCode(qrCode);
      
      if (!qrData) {
        return res.json({ success: false, status: 'invalid', message: 'QR code tidak ditemukan' });
      }

      // If QR code is used, find the check-in record
      if (qrData.status === 'used') {
        // Find the most recent check-in for this user
        const checkIns = await storage.getUserCheckIns(qrData.userId);
        const latestCheckIn = checkIns && checkIns.length > 0 ? checkIns[0] : null;
        
        return res.json({
          success: true,
          status: 'used',
          checkIn: latestCheckIn,
          user: {
            firstName: qrData.user.firstName,
            lastName: qrData.user.lastName
          }
        });
      }

      // QR code is still valid
      return res.json({
        success: true,
        status: qrData.status,
        expiresAt: qrData.expiresAt
      });
    } catch (error) {
      console.error("Error checking QR code status:", error);
      res.status(500).json({ success: false, message: "Failed to check QR code status" });
    }
  });

  // Public check-in verification endpoint (no auth required) - One-time QR
  app.post('/api/checkin/verify', async (req, res) => {
    try {
      const { qrCode } = req.body;
      
      if (!qrCode) {
        return res.status(400).json({ 
          success: false,
          message: 'Kode QR tidak valid' 
        });
      }

      // Validate one-time QR code
      const qrData = await storage.validateOneTimeQrCode(qrCode);
      
      if (!qrData) {
        return res.status(404).json({ 
          success: false,
          message: 'QR code tidak valid atau tidak ditemukan' 
        });
      }

      // Check if QR code is already used
      if (qrData.status === 'used') {
        return res.json({
          success: false,
          message: 'QR code sudah pernah digunakan'
        });
      }

      // Check if QR code is expired
      const now = new Date();
      if (qrData.status === 'expired' || qrData.expiresAt < now) {
        return res.json({
          success: false,
          message: 'QR code sudah kadaluarsa. Silakan generate QR baru'
        });
      }

      const memberUser = qrData.user;

      // Sanitize user data - only return safe fields for display
      const safeUserData = {
        firstName: memberUser.firstName,
        lastName: memberUser.lastName
      };

      // Check if user is suspended
      if (memberUser.active === false) {
        return res.json({
          success: false,
          user: safeUserData,
          message: 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin untuk informasi lebih lanjut.'
        });
      }

      // Check membership status
      const hasActiveMembership = qrData.membership && new Date(qrData.membership.endDate) > now;

      // If no active membership, return failure response with member info
      if (!hasActiveMembership) {
        return res.json({
          success: false,
          user: safeUserData,
          message: 'Belum terdaftar membership atau membership sudah expired'
        });
      }

      // Mark QR code as used (atomic operation to prevent race conditions)
      try {
        await storage.markQrCodeAsUsed(qrCode);
      } catch (error) {
        // QR already used by another concurrent request
        return res.json({
          success: false,
          message: 'QR code sudah pernah digunakan'
        });
      }

      // Create check-in
      const { randomUUID } = await import('crypto');
      const checkInQr = randomUUID();
      const checkIn = await storage.createCheckIn({
        userId: memberUser.id,
        qrCode: checkInQr,
        status: 'active',
      });

      // Sanitize check-in data before returning
      res.json({
        success: true,
        user: safeUserData,
        checkIn: {
          id: checkIn.id,
          checkInTime: checkIn.checkInTime
        }
      });
    } catch (error) {
      console.error("Error verifying check-in:", error);
      res.status(500).json({ 
        success: false,
        message: "Terjadi kesalahan saat check-in" 
      });
    }
  });

  // Class routes
  app.get('/api/classes', isAuthenticated, async (req, res) => {
    try {
      const classes = await storage.getGymClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post('/api/classes/:classId/book', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { classId } = req.params;
      const { bookingDate } = req.body;

      const booking = await storage.bookClass({
        userId,
        classId,
        bookingDate: new Date(bookingDate),
        status: 'booked',
      });

      res.json(booking);
    } catch (error) {
      console.error("Error booking class:", error);
      res.status(500).json({ message: "Failed to book class" });
    }
  });

  app.get('/api/class-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookings = await storage.getUserClassBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching class bookings:", error);
      res.status(500).json({ message: "Failed to fetch class bookings" });
    }
  });

  app.put('/api/class-bookings/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const userBookings = await storage.getUserClassBookings(userId);
      const booking = userBookings.find(b => b.id === id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found or unauthorized' });
      }
      
      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: 'Booking already cancelled' });
      }
      
      await storage.cancelClassBooking(id);
      res.json({ message: 'Class booking cancelled successfully' });
    } catch (error) {
      console.error("Error cancelling class booking:", error);
      res.status(500).json({ message: "Failed to cancel class booking" });
    }
  });

  // Payment routes
  app.get('/api/membership-plans', async (req, res) => {
    try {
      const plans = await storage.getMembershipPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching membership plans:", error);
      res.status(500).json({ message: "Failed to fetch membership plans" });
    }
  });

  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({ 
          message: 'Payment gateway not configured. Please contact administrator.' 
        });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { planId } = req.body;

      if (!user?.email) {
        return res.status(400).json({ message: 'User email required' });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
        customerId = customer.id;
      }

      // Get membership plan
      const plans = await storage.getMembershipPlans();
      const plan = plans.find(p => p.id === planId);
      if (!plan || !plan.stripePriceId) {
        return res.status(400).json({ message: 'Invalid membership plan' });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with Stripe info
      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      // Create membership record
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);

      await storage.createMembership({
        userId,
        planId,
        startDate,
        endDate,
        status: 'active',
        autoRenewal: true,
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice & {
        payment_intent?: Stripe.PaymentIntent | string;
      };
      const paymentIntent = typeof invoice.payment_intent === 'string' 
        ? null 
        : invoice.payment_intent;
      
      if (!paymentIntent?.client_secret) {
        throw new Error('No payment intent found');
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Admin routes
  app.get('/api/admin/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const [users, revenue, membershipStats] = await Promise.all([
        storage.getUsersWithMemberships(),
        storage.getRevenueStats(),
        storage.getMembershipStats(),
      ]);

      // Calculate active members today (simplified - users with recent check-ins)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeToday = 0; // This would need a more complex query

      res.json({
        users,
        stats: {
          totalMembers: users.length,
          activeToday,
          expiringSoon: membershipStats.expiringSoon,
          revenue,
        }
      });
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard" });
    }
  });

  app.get('/api/admin/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const members = await storage.getUsersWithMemberships();
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post('/api/admin/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { password, ...memberData } = req.body;
      
      const existingUsername = await storage.getUserByUsername(memberData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      const existingEmail = await storage.getUserByEmail(memberData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }

      const hashedPassword = await bcrypt.hash(password || 'default123', 10);

      const newMember = await storage.createUser({
        ...memberData,
        password: hashedPassword,
        role: 'member',
      });

      res.json({ ...newMember, password: undefined });
    } catch (error: any) {
      console.error("Error creating member:", error);
      res.status(500).json({ message: error.message || "Failed to create member" });
    }
  });

  app.put('/api/admin/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const { password, ...updateData } = req.body;

      if (updateData.username) {
        const existingUsername = await storage.getUserByUsername(updateData.username);
        if (existingUsername && existingUsername.id !== id) {
          return res.status(400).json({ message: "Username sudah digunakan" });
        }
      }

      if (updateData.email) {
        const existingEmail = await storage.getUserByEmail(updateData.email);
        if (existingEmail && existingEmail.id !== id) {
          return res.status(400).json({ message: "Email sudah digunakan" });
        }
      }

      const dataToUpdate: any = { ...updateData };
      if (password) {
        dataToUpdate.password = await bcrypt.hash(password, 10);
      }

      const updatedMember = await storage.updateUser(id, dataToUpdate);
      res.json({ ...updatedMember, password: undefined });
    } catch (error: any) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: error.message || "Failed to update member" });
    }
  });

  app.delete('/api/admin/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: 'Member deleted successfully' });
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  app.put('/api/admin/members/:id/suspend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const updatedMember = await storage.updateUser(id, { active: false });
      res.json({ 
        message: 'Member suspended successfully',
        member: { ...updatedMember, password: undefined }
      });
    } catch (error) {
      console.error("Error suspending member:", error);
      res.status(500).json({ message: "Failed to suspend member" });
    }
  });

  app.put('/api/admin/members/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const updatedMember = await storage.updateUser(id, { active: true });
      res.json({ 
        message: 'Member activated successfully',
        member: { ...updatedMember, password: undefined }
      });
    } catch (error) {
      console.error("Error activating member:", error);
      res.status(500).json({ message: "Failed to activate member" });
    }
  });

  app.post('/api/admin/members/:id/membership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id: memberId } = req.params;
      const { planId, durationMonths } = req.body;

      const plan = await storage.getMembershipPlans();
      const selectedPlan = plan.find(p => p.id === planId);
      
      if (!selectedPlan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      const existingMembership = await storage.getUserMembership(memberId);
      if (existingMembership) {
        await storage.cancelUserMemberships(memberId);
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (durationMonths || selectedPlan.durationMonths));

      const membership = await storage.createMembership({
        userId: memberId,
        planId,
        startDate,
        endDate,
        status: 'active',
        autoRenewal: false,
      });

      res.json(membership);
    } catch (error: any) {
      console.error("Error assigning membership:", error);
      res.status(500).json({ message: error.message || "Failed to assign membership" });
    }
  });

  app.get('/api/admin/membership-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const plans = await storage.getAllMembershipPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching membership plans:", error);
      res.status(500).json({ message: "Failed to fetch membership plans" });
    }
  });

  app.post('/api/admin/membership-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const validatedData = insertMembershipPlanSchema.parse(req.body);
      const plan = await storage.createMembershipPlan(validatedData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating membership plan:", error);
      res.status(500).json({ message: "Failed to create membership plan" });
    }
  });

  app.put('/api/admin/membership-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const updateData = req.body;
      
      const plan = await storage.updateMembershipPlan(id, updateData);
      res.json(plan);
    } catch (error) {
      console.error("Error updating membership plan:", error);
      res.status(500).json({ message: "Failed to update membership plan" });
    }
  });

  app.delete('/api/admin/membership-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.deleteMembershipPlan(id);
      res.json({ message: 'Membership plan deleted successfully' });
    } catch (error) {
      console.error("Error deleting membership plan:", error);
      res.status(500).json({ message: "Failed to delete membership plan" });
    }
  });

  app.post('/api/admin/classes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const validatedData = insertGymClassSchema.parse(req.body);
      const gymClass = await storage.createGymClass(validatedData);
      res.json(gymClass);
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.get('/api/admin/classes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const classes = await storage.getGymClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.put('/api/admin/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const updateData = req.body;
      
      await storage.updateGymClass(id, updateData);
      res.json({ message: 'Class updated successfully' });
    } catch (error) {
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  app.delete('/api/admin/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.deleteGymClass(id);
      res.json({ message: 'Class deleted successfully' });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  app.get('/api/admin/class-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const bookings = await storage.getAllClassBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching class bookings:", error);
      res.status(500).json({ message: "Failed to fetch class bookings" });
    }
  });

  app.put('/api/admin/class-bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      await storage.updateClassBookingStatus(id, status);
      res.json({ message: 'Class booking updated successfully' });
    } catch (error) {
      console.error("Error updating class booking:", error);
      res.status(500).json({ message: "Failed to update class booking" });
    }
  });

  app.delete('/api/admin/class-bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.cancelClassBooking(id);
      res.json({ message: 'Class booking cancelled successfully' });
    } catch (error) {
      console.error("Error cancelling class booking:", error);
      res.status(500).json({ message: "Failed to cancel class booking" });
    }
  });

  // Admin Check-in routes
  app.post('/api/admin/checkin/validate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { qrCode } = req.body;
      if (!qrCode) {
        return res.status(400).json({ message: 'QR code is required' });
      }

      console.log(`[Admin Check-in] Validating QR code: ${qrCode}`);

      // Try to find user by permanent QR code first
      let memberUser = await storage.getUserByPermanentQrCode(qrCode);
      let isOneTimeQr = false;
      
      // If not found by permanent QR code, try to find by one-time QR code
      if (!memberUser) {
        console.log(`[Admin Check-in] Not a permanent QR, checking one-time QR...`);
        const oneTimeQr = await storage.validateOneTimeQrCode(qrCode);
        
        if (oneTimeQr) {
          console.log(`[Admin Check-in] Found one-time QR with status: ${oneTimeQr.status}`);
          // Check if QR code is still valid
          const now = new Date();
          if (oneTimeQr.status === 'used') {
            return res.json({
              success: false,
              message: 'QR code sudah pernah digunakan'
            });
          }
          
          if (oneTimeQr.status === 'expired' || oneTimeQr.expiresAt < now) {
            return res.json({
              success: false,
              message: 'QR code sudah kadaluarsa. Silakan generate QR baru'
            });
          }
          
          // Get user from one-time QR code
          memberUser = await storage.getUser(oneTimeQr.userId);
          isOneTimeQr = true;
          console.log(`[Admin Check-in] Valid one-time QR for user: ${memberUser?.firstName} ${memberUser?.lastName}`);
        } else {
          console.log(`[Admin Check-in] One-time QR not found`);
        }
      }
      
      if (!memberUser) {
        return res.status(404).json({ 
          success: false,
          message: 'QR code tidak valid atau member tidak ditemukan' 
        });
      }

      // Check membership status
      const membership = await storage.getUserMembership(memberUser.id);
      const now = new Date();
      const hasActiveMembership = membership && new Date(membership.endDate) > now;

      // If no active membership, return failure response with member info
      if (!hasActiveMembership) {
        return res.json({
          success: false,
          user: memberUser,
          membership,
          message: 'Belum terdaftar membership atau membership sudah expired'
        });
      }

      // Membership is active, create check-in using permanent QR code or user ID
      let checkInData;
      if (memberUser.permanentQrCode) {
        checkInData = await storage.validateMemberQrAndCheckIn(memberUser.permanentQrCode);
      } else {
        // If user doesn't have permanent QR code, create one and use it for check-in
        const permanentQr = await storage.ensureUserPermanentQrCode(memberUser.id);
        checkInData = await storage.validateMemberQrAndCheckIn(permanentQr);
      }
      
      if (!checkInData) {
        return res.status(500).json({ 
          success: false,
          message: 'Gagal membuat check-in' 
        });
      }

      // Mark one-time QR code as used ONLY after successful check-in
      if (isOneTimeQr) {
        try {
          console.log(`[Admin Check-in] Marking one-time QR code as used: ${qrCode}`);
          await storage.markQrCodeAsUsed(qrCode);
          console.log(`[Admin Check-in] Successfully marked QR code as used`);
        } catch (error) {
          // Log the error but don't fail the request since check-in was successful
          console.error("[Admin Check-in] Warning: Could not mark QR code as used:", error);
        }
      }

      console.log(`[Admin Check-in] Check-in successful for user: ${checkInData.user?.firstName} ${checkInData.user?.lastName}`);
      res.json({
        success: true,
        ...checkInData
      });
    } catch (error) {
      console.error("Error validating check-in:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to validate check-in" 
      });
    }
  });

  app.get('/api/admin/checkins', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const checkIns = await storage.getRecentCheckIns(limit);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });

  app.post('/api/admin/auto-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const checkedOutCount = await storage.autoCheckoutExpiredSessions();
      res.json({ 
        success: true, 
        checkedOutCount,
        message: `Successfully auto-checked out ${checkedOutCount} member(s)`
      });
    } catch (error) {
      console.error("Error running auto-checkout:", error);
      res.status(500).json({ message: "Failed to run auto-checkout" });
    }
  });

  // Feedback routes
  app.post('/api/feedbacks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { subject, message, rating } = req.body;

      if (!subject || !message) {
        return res.status(400).json({ message: 'Subject and message are required' });
      }

      const feedback = await storage.createFeedback({
        userId,
        subject,
        message,
        rating: rating || null,
        status: 'pending',
      });

      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.get('/api/feedbacks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const feedbacks = await storage.getUserFeedbacks(userId);
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      res.status(500).json({ message: "Failed to fetch feedbacks" });
    }
  });

  app.get('/api/admin/feedbacks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const feedbacks = await storage.getAllFeedbacks();
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching all feedbacks:", error);
      res.status(500).json({ message: "Failed to fetch feedbacks" });
    }
  });

  app.put('/api/admin/feedbacks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const { status, adminResponse } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      await storage.updateFeedbackStatus(id, status, adminResponse);
      res.json({ message: 'Feedback updated successfully' });
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  // Personal Trainer routes
  app.get('/api/trainers', isAuthenticated, async (req, res) => {
    try {
      const trainers = await storage.getActiveTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ message: "Failed to fetch trainers" });
    }
  });

  app.get('/api/trainers/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const trainer = await storage.getTrainerById(id);
      
      if (!trainer) {
        return res.status(404).json({ message: 'Trainer not found' });
      }
      
      res.json(trainer);
    } catch (error) {
      console.error("Error fetching trainer:", error);
      res.status(500).json({ message: "Failed to fetch trainer" });
    }
  });

  // Admin PT management routes
  app.get('/api/admin/trainers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const trainers = await storage.getAllTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ message: "Failed to fetch trainers" });
    }
  });

  app.post('/api/admin/trainers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const trainerSchema = z.object({
        name: z.string().min(1, "Name is required"),
        bio: z.string().optional(),
        specialization: z.string().min(1, "Specialization is required"),
        experience: z.number().optional(),
        certification: z.string().optional(),
        imageUrl: z.string().optional(),
        pricePerSession: z.string().or(z.number()).transform(val => String(val)),
        availability: z.any().optional(),
        active: z.boolean().optional().default(true),
      });

      const validatedData = trainerSchema.parse(req.body);
      const trainer = await storage.createTrainer(validatedData);
      res.json(trainer);
    } catch (error: any) {
      console.error("Error creating trainer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid trainer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create trainer" });
    }
  });

  app.put('/api/admin/trainers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      
      const updateTrainerSchema = z.object({
        name: z.string().min(1).optional(),
        bio: z.string().optional(),
        specialization: z.string().min(1).optional(),
        experience: z.number().optional(),
        certification: z.string().optional(),
        imageUrl: z.string().optional(),
        pricePerSession: z.string().or(z.number()).transform(val => String(val)).optional(),
        availability: z.any().optional(),
        active: z.boolean().optional(),
      });

      const validatedData = updateTrainerSchema.parse(req.body);
      await storage.updateTrainer(id, validatedData);
      res.json({ message: 'Trainer updated successfully' });
    } catch (error: any) {
      console.error("Error updating trainer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid trainer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update trainer" });
    }
  });

  app.delete('/api/admin/trainers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.deleteTrainer(id);
      res.json({ message: 'Trainer deleted successfully' });
    } catch (error) {
      console.error("Error deleting trainer:", error);
      res.status(500).json({ message: "Failed to delete trainer" });
    }
  });

  // PT Booking routes
  app.get('/api/pt-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookings = await storage.getUserPtBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching PT bookings:", error);
      res.status(500).json({ message: "Failed to fetch PT bookings" });
    }
  });

  app.post('/api/pt-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const ptBookingSchema = z.object({
        trainerId: z.string().min(1, "Trainer ID is required"),
        bookingDate: z.string().min(1, "Booking date is required"),
        duration: z.number().optional().default(60),
        notes: z.string().optional(),
      });

      const validatedData = ptBookingSchema.parse(req.body);

      const booking = await storage.createPtBooking({
        userId,
        trainerId: validatedData.trainerId,
        bookingDate: new Date(validatedData.bookingDate),
        duration: validatedData.duration,
        notes: validatedData.notes,
        status: 'pending',
      });

      res.json(booking);
    } catch (error: any) {
      console.error("Error creating PT booking:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create PT booking" });
    }
  });

  app.put('/api/pt-bookings/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const userBookings = await storage.getUserPtBookings(userId);
      const booking = userBookings.find(b => b.id === id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found or unauthorized' });
      }
      
      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: 'Booking already cancelled' });
      }
      
      await storage.cancelPtBooking(id);
      res.json({ message: 'PT booking cancelled successfully' });
    } catch (error) {
      console.error("Error cancelling PT booking:", error);
      res.status(500).json({ message: "Failed to cancel PT booking" });
    }
  });

  // Admin PT booking management
  app.get('/api/admin/pt-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const bookings = await storage.getAllPtBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching PT bookings:", error);
      res.status(500).json({ message: "Failed to fetch PT bookings" });
    }
  });

  app.put('/api/admin/pt-bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      await storage.updatePtBookingStatus(id, status);
      res.json({ message: 'PT booking updated successfully' });
    } catch (error) {
      console.error("Error updating PT booking:", error);
      res.status(500).json({ message: "Failed to update PT booking" });
    }
  });

  // Indonesian Payment Gateway Routes
  
  // QRIS Payment
  app.post('/api/payment/qris', isAuthenticated, async (req: any, res) => {
    try {
      if (!midtransCore) {
        return res.status(501).json({ 
          message: 'Payment gateway belum dikonfigurasi. Hubungi administrator.' 
        });
      }

      // Validate input
      const qrisPaymentSchema = z.object({
        planId: z.string().min(1, 'Plan ID diperlukan'),
      });

      const validatedData = qrisPaymentSchema.parse(req.body);
      const { planId } = validatedData;

      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.email) {
        return res.status(400).json({ message: 'Email user diperlukan' });
      }

      // Get membership plan
      const plans = await storage.getMembershipPlans();
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        return res.status(400).json({ message: 'Paket membership tidak valid' });
      }

      const orderId = `gym-${userId}-${Date.now()}`;
      const parameter = {
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: parseInt(plan.price),
        },
        qris: {
          acquirer: 'gopay'
        },
        customer_details: {
          first_name: user.firstName || 'Member',
          last_name: user.lastName || 'Gym',
          email: user.email,
        },
        item_details: [{
          id: plan.id,
          price: parseInt(plan.price),
          quantity: 1,
          name: `Membership ${plan.name}`,
          category: 'Gym Membership'
        }]
      };

      const qrisTransaction = await midtransCore.charge(parameter);
      
      // Create payment record with proper reconciliation fields
      const paymentRecord = await storage.createPayment({
        userId,
        amount: plan.price,
        currency: 'IDR',
        status: 'pending',
        description: `${orderId} - Membership ${plan.name} - QRIS`,
        stripePaymentIntentId: qrisTransaction.transaction_id, // Store Midtrans transaction ID
      });

      res.json({
        orderId,
        qrString: qrisTransaction.qr_string,
        transactionId: qrisTransaction.transaction_id,
        transactionStatus: qrisTransaction.transaction_status,
        paymentId: paymentRecord.id,
        message: 'Scan QR Code untuk melakukan pembayaran'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Data input tidak valid', 
          errors: error.errors 
        });
      }
      console.error("Error creating QRIS payment:", error);
      res.status(500).json({ message: "Gagal membuat pembayaran QRIS" });
    }
  });

  // Virtual Account Payment
  app.post('/api/payment/va', isAuthenticated, async (req: any, res) => {
    try {
      if (!midtransCore) {
        return res.status(501).json({ 
          message: 'Payment gateway belum dikonfigurasi. Hubungi administrator.' 
        });
      }

      // Validate input
      const vaPaymentSchema = z.object({
        planId: z.string().min(1, 'Plan ID diperlukan'),
        bankCode: z.enum(['bca', 'bni', 'bri', 'mandiri', 'permata'], {
          errorMap: () => ({ message: 'Bank tidak didukung' })
        }),
      });

      const validatedData = vaPaymentSchema.parse(req.body);
      const { planId, bankCode } = validatedData;

      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.email) {
        return res.status(400).json({ message: 'Email user diperlukan' });
      }

      // Get membership plan
      const plans = await storage.getMembershipPlans();
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        return res.status(400).json({ message: 'Paket membership tidak valid' });
      }

      const orderId = `gym-va-${userId}-${Date.now()}`;
      
      // Different parameter structure for different banks
      let parameter: any = {
        transaction_details: {
          order_id: orderId,
          gross_amount: parseInt(plan.price),
        },
        customer_details: {
          first_name: user.firstName || 'Member',
          last_name: user.lastName || 'Gym',
          email: user.email,
        },
        item_details: [{
          id: plan.id,
          price: parseInt(plan.price),
          quantity: 1,
          name: `Membership ${plan.name}`,
          category: 'Gym Membership'
        }]
      };

      // Handle different bank requirements
      if (bankCode === 'mandiri') {
        parameter.payment_type = 'echannel';
        parameter.echannel = {
          bill_info1: `Membership ${plan.name}`,
          bill_info2: `Gym Idachi Fitness`
        };
      } else {
        parameter.payment_type = 'bank_transfer';
        parameter.bank_transfer = {
          bank: bankCode
        };
      }

      const vaTransaction = await midtransCore.charge(parameter);
      
      // Extract VA number based on bank
      let vaNumber: string = '';
      let expiry: string = '';
      
      if (bankCode === 'mandiri') {
        vaNumber = vaTransaction.bill_key || '';
        expiry = vaTransaction.biller_code || '';
      } else if (bankCode === 'permata') {
        vaNumber = vaTransaction.permata_va_number || '';
      } else {
        vaNumber = vaTransaction.va_numbers?.[0]?.va_number || '';
        if (vaTransaction.va_numbers?.[0]) {
          expiry = vaTransaction.va_numbers[0].expiry_date || '';
        }
      }
      
      // Create payment record with proper reconciliation fields
      const paymentRecord = await storage.createPayment({
        userId,
        amount: plan.price,
        currency: 'IDR',
        status: 'pending',
        description: `${orderId} - Membership ${plan.name} - VA ${bankCode.toUpperCase()}`,
        stripePaymentIntentId: vaTransaction.transaction_id, // Store Midtrans transaction ID
      });

      res.json({
        orderId,
        vaNumber,
        bank: bankCode.toUpperCase(),
        expiry,
        transactionId: vaTransaction.transaction_id,
        transactionStatus: vaTransaction.transaction_status,
        paymentId: paymentRecord.id,
        message: `Transfer ke Virtual Account ${bankCode.toUpperCase()}`,
        instructions: `Transfer sejumlah Rp ${parseInt(plan.price).toLocaleString('id-ID')} ke nomor VA: ${vaNumber}`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Data input tidak valid', 
          errors: error.errors 
        });
      }
      console.error("Error creating VA payment:", error);
      res.status(500).json({ message: "Gagal membuat Virtual Account" });
    }
  });

  // Payment status check endpoint
  app.get('/api/payment/status/:orderId', isAuthenticated, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      
      // Verify the order belongs to this user by checking the order format
      // Format: gym-${userId}-${timestamp} or gym-va-${userId}-${timestamp}
      const orderParts = orderId.split('-');
      const isGymFormat = orderParts[0] === 'gym' && orderParts[1] !== 'va';
      const isGymVaFormat = orderParts[0] === 'gym' && orderParts[1] === 'va';
      
      let orderUserId = '';
      if (isGymFormat && orderParts.length >= 3) {
        orderUserId = orderParts[1];
      } else if (isGymVaFormat && orderParts.length >= 4) {
        orderUserId = orderParts[2];
      }
      
      if (!orderUserId || orderUserId !== userId) {
        return res.status(403).json({ message: 'Unauthorized access to payment status' });
      }

      // Get payment by description (which contains the order ID)
      const payment = await storage.getPaymentByOrderId(orderId);
      
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      res.json({
        orderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        transactionId: payment.stripePaymentIntentId
      });
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // Payment notification webhook (for Midtrans)
  app.post('/api/payment/midtrans/notify', async (req, res) => {
    try {
      if (!midtransCore) {
        return res.status(501).json({ message: 'Payment gateway not configured' });
      }

      const notificationJson = req.body;
      
      // Verify signature for security
      const orderId = notificationJson.order_id;
      const statusCode = notificationJson.status_code;
      const grossAmount = notificationJson.gross_amount;
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      
      if (!serverKey) {
        console.error("Missing Midtrans server key for signature verification");
        return res.status(500).json({ message: "Server configuration error" });
      }

      // Create signature hash
      const crypto = require('crypto');
      const signatureKey = orderId + statusCode + grossAmount + serverKey;
      const signature = crypto.createHash('sha512').update(signatureKey).digest('hex');
      
      if (signature !== notificationJson.signature_key) {
        console.error(`Invalid signature for order ${orderId}`);
        return res.status(401).json({ message: "Invalid signature" });
      }

      const statusResponse = await midtransCore.transaction.notification(notificationJson);
      
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      const transactionId = statusResponse.transaction_id;

      console.log(`Transaction notification received. Order ID: ${orderId}. Transaction status: ${transactionStatus}. Fraud status: ${fraudStatus}`);

      // Find payment record by order ID (extract user ID from order ID format)
      // Format: gym-${userId}-${timestamp} or gym-va-${userId}-${timestamp}
      const orderParts = orderId.split('-');
      let userId: string | null = null;
      
      const isGymFormat = orderParts[0] === 'gym' && orderParts[1] !== 'va';
      const isGymVaFormat = orderParts[0] === 'gym' && orderParts[1] === 'va';
      
      if (isGymFormat && orderParts.length >= 3) {
        userId = orderParts[1];
      } else if (isGymVaFormat && orderParts.length >= 4) {
        userId = orderParts[2];
      }

      if (!userId) {
        console.error(`Could not extract user ID from order ID: ${orderId}`);
        return res.status(400).json({ message: "Invalid order ID format" });
      }

      // Update payment status based on transaction status
      let paymentStatus = 'pending';
      let shouldActivateMembership = false;

      if (transactionStatus === 'capture') {
        if (fraudStatus === 'challenge') {
          paymentStatus = 'challenged';
        } else if (fraudStatus === 'accept') {
          paymentStatus = 'completed';
          shouldActivateMembership = true;
        }
      } else if (transactionStatus === 'settlement') {
        paymentStatus = 'completed';
        shouldActivateMembership = true;
      } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
        paymentStatus = 'failed';
      } else if (transactionStatus === 'pending') {
        paymentStatus = 'pending';
      }

      // Update payment record with transaction details
      await storage.updatePaymentStatus(transactionId, paymentStatus);

      // If payment is successful, activate membership
      if (shouldActivateMembership) {
        try {
          // Extract plan ID from the order or get from most recent pending payment for this user
          const userPayments = await storage.getUserPayments(userId);
          const pendingPayment = userPayments.find(p => p.status === 'pending' || p.status === 'completed');
          
          if (pendingPayment?.membershipId) {
            // Update existing membership status to active
            await storage.updateMembershipStatus(pendingPayment.membershipId, 'active');
          } else {
            // Create new membership based on payment
            // This would need to be enhanced to extract plan info from payment description
            console.log(`Payment successful for user ${userId}, but no membership plan found to activate`);
          }
          
          console.log(`Membership activated for user ${userId} after successful payment`);
        } catch (error) {
          console.error(`Error activating membership for user ${userId}:`, error);
        }
      }

      res.status(200).json({ message: 'OK' });
    } catch (error) {
      console.error("Error handling payment notification:", error);
      res.status(500).json({ message: "Failed to handle notification" });
    }
  });

  // Notification check for expiring memberships
  app.get('/api/notifications/expiring', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const expiring = await storage.getExpiringMemberships(20);
      
      // For members, only return their own expiring membership
      if (user?.role !== 'admin') {
        const userExpiring = expiring.filter(membership => membership.userId === userId);
        return res.json(userExpiring);
      }
      
      // For admins, return all expiring memberships
      res.json(expiring);
    } catch (error) {
      console.error("Error fetching expiring memberships:", error);
      res.status(500).json({ message: "Failed to fetch expiring memberships" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
