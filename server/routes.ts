import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import * as midtransClient from 'midtrans-client';
import passport from "passport";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { insertMembershipPlanSchema, insertGymClassSchema, insertClassBookingSchema, insertCheckInSchema, insertPaymentSchema, registerSchema, loginSchema } from "@shared/schema";
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
      const qrCode = randomUUID();
      
      const checkIn = await storage.createCheckIn({
        userId,
        qrCode,
        status: 'active',
      });

      res.json({ checkIn, qrCode });
    } catch (error) {
      console.error("Error generating check-in:", error);
      res.status(500).json({ message: "Failed to generate check-in" });
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
      await storage.updateUser(id, { active: false });
      res.json({ message: 'Member suspended successfully' });
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
      await storage.updateUser(id, { active: true });
      res.json({ message: 'Member activated successfully' });
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

      const checkInData = await storage.validateCheckInQR(qrCode);
      
      if (!checkInData) {
        return res.status(404).json({ message: 'Invalid or expired QR code' });
      }

      res.json(checkInData);
    } catch (error) {
      console.error("Error validating check-in:", error);
      res.status(500).json({ message: "Failed to validate check-in" });
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
          bill_info2: `Gym FitZone`
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
