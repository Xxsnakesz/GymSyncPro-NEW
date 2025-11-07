import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import passport from "passport";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { insertMembershipPlanSchema, insertGymClassSchema, insertClassBookingSchema, insertCheckInSchema, insertPaymentSchema, registerSchema, loginSchema, forgotPasswordRequestSchema, resetPasswordSchema, verifyEmailSchema, insertPromotionSchema } from "@shared/schema";
import { sendPasswordResetEmail } from "./email/resend";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import fs from 'fs';
import path from 'path';
import { sendNotificationWithPush } from "./push";
import { normalizePhone, sendWhatsAppText } from "./whatsapp";
import { getUncachableResendClient, getResendClientForAdmin, buildBrandedEmailHtml, buildBrandedEmailHtmlWithCta, textToSafeHtml } from "./email/resend";

// Temporary storage for email verification codes (before user creation)
const pendingVerifications = new Map<string, { code: string; expiresAt: Date }>();

// Clean up expired verification codes every 5 minutes
setInterval(() => {
  const now = new Date();
  const entries = Array.from(pendingVerifications.entries());
  for (const [email, data] of entries) {
    if (now > data.expiresAt) {
      pendingVerifications.delete(email);
    }
  }
}, 5 * 60 * 1000);

// Make Stripe optional - can be added later
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Public health check (no auth required)
  app.get('/api/health', async (_req, res) => {
    const startedAt = new Date().toISOString();
    let dbConnected = true as boolean;
    let dbError: string | undefined;
    try {
      // Lightweight DB check: attempt a simple query via storage
      // Using getAllUsers is safe for connectivity validation; we don't return its data
      await storage.getAllUsers();
    } catch (e: any) {
      dbConnected = false;
      dbError = e?.message || 'Unknown DB error';
    }
    res.json({ ok: true, env: app.get('env'), startedAt, dbConnected, dbError });
  });

  // Integrations health (no auth, safe info only)
  app.get('/api/health/integrations', async (_req, res) => {
    const resp: any = { ok: true };
    // Resend status (do not expose secrets)
    const resendConfigured = Boolean(process.env.RESEND_API_KEY);
    const adminKeyConfigured = Boolean(process.env.RESEND_API_KEY_ADMIN);
    const verifKeyConfigured = Boolean(process.env.RESEND_API_KEY_VERIFICATION);
    resp.resend = {
      configured: resendConfigured,
      default: {
        fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      },
      admin: {
        apiKeyOverride: adminKeyConfigured,
        fromEmail: process.env.RESEND_FROM_EMAIL_ADMIN || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        replyTo: process.env.RESEND_REPLY_TO_ADMIN || undefined,
      },
      verification: {
        apiKeyOverride: verifKeyConfigured,
        fromEmail: process.env.RESEND_FROM_EMAIL_VERIFICATION || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      },
    };
    if (resendConfigured) {
      try {
        const { client } = await (await import('./email/resend')).getUncachableResendClient();
        const anyFrom = resp.resend.admin.fromEmail || resp.resend.default.fromEmail;
        const domain = anyFrom.includes('@') ? anyFrom.split('@')[1]?.trim() : '';
        // Best-effort: check domain list if SDK supports it
        const anyClient: any = client as any;
        if (anyClient?.domains?.list && domain) {
          const result = await anyClient.domains.list();
          const domains = result?.data || result || [];
          const found = domains.find((d: any) => d?.name === domain);
          resp.resend.domain = found ? { name: found.name, status: found.status || 'unknown' } : { name: domain, status: 'unknown' };
        }
      } catch (e: any) {
        resp.resend.error = e?.message || String(e);
      }
    }
    res.json(resp);
  });

  // Admin image upload (base64 data URL)
  app.post('/api/admin/upload-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { dataUrl } = req.body as { dataUrl?: string };
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ message: 'Gambar tidak valid' });
      }

      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ message: 'Format gambar harus PNG/JPEG/WEBP' });
      }

      const mime = match[1];
      const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
      const base64 = match[3];
      const buffer = Buffer.from(base64, 'base64');

      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const filename = `${randomUUID()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, buffer);

      const url = `/uploads/${filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Gagal mengunggah gambar' });
    }
  });

  // Register route
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user (not verified yet)
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone ? `+62${validatedData.phone}` : undefined,
        password: hashedPassword,
        role: 'member',
      });

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code
      await storage.storeVerificationCode(user.email, verificationCode);
      
      // Send verification email
      const { sendVerificationEmail } = await import('./email/resend');
      await sendVerificationEmail(user.email, verificationCode);

      res.json({ 
        message: "Registrasi berhasil! Silakan cek email Anda untuk kode verifikasi.",
        email: user.email,
        requireVerification: true
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
        phone: validatedData.phone ? `+62${validatedData.phone}` : undefined,
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

  // Email verification route
  app.post('/api/verify-email', async (req, res) => {
    try {
      const validatedData = verifyEmailSchema.parse(req.body);
      
      const verified = await storage.verifyEmailCode(validatedData.email, validatedData.verificationCode);
      
      if (!verified) {
        return res.status(400).json({ message: "Kode verifikasi tidak valid atau sudah kadaluarsa" });
      }

      // Get the verified user
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      // Log user in after verification
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login after verification" });
        }
        res.json({ 
          message: "Email berhasil diverifikasi! Selamat datang di Idachi Fitness!",
          user: { ...user, password: undefined }
        });
      });
    } catch (error: any) {
      console.error("Error during email verification:", error);
      res.status(400).json({ message: error.message || "Verifikasi email gagal" });
    }
  });

  // Send verification code (new flow - before registration)
  app.post('/api/send-verification-code', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email diperlukan" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email sudah terdaftar" });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Store in pending verifications
      pendingVerifications.set(email, { code: verificationCode, expiresAt });
      
      // Send verification email
      const { sendVerificationEmail } = await import('./email/resend');
      await sendVerificationEmail(email, verificationCode);

      res.json({ 
        message: "Kode verifikasi telah dikirim ke email Anda",
        success: true
      });
    } catch (error: any) {
      console.error("Error during send verification:", error);
      res.status(500).json({ message: error.message || "Gagal mengirim kode verifikasi" });
    }
  });

  // Check verification code (without logging in)
  app.post('/api/check-verification-code', async (req, res) => {
    try {
      const { email, verificationCode } = req.body;
      
      if (!email || !verificationCode) {
        return res.status(400).json({ message: "Email dan kode verifikasi diperlukan" });
      }

      const pending = pendingVerifications.get(email);
      
      if (!pending) {
        return res.status(400).json({ message: "Kode verifikasi tidak ditemukan. Silakan kirim ulang kode." });
      }

      if (new Date() > pending.expiresAt) {
        pendingVerifications.delete(email);
        return res.status(400).json({ message: "Kode verifikasi sudah kadaluarsa. Silakan kirim ulang kode." });
      }

      if (pending.code !== verificationCode) {
        return res.status(400).json({ message: "Kode verifikasi tidak valid" });
      }

      // Mark as verified by keeping it but adding verified flag
      pendingVerifications.set(email, { ...pending, verified: true } as any);

      res.json({ 
        message: "Email berhasil diverifikasi!",
        verified: true
      });
    } catch (error: any) {
      console.error("Error during check verification:", error);
      res.status(400).json({ message: error.message || "Verifikasi gagal" });
    }
  });

  // Register with verified email (new flow)
  app.post('/api/register-verified', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if email was verified
      const pending = pendingVerifications.get(validatedData.email);
      if (!pending || !(pending as any).verified) {
        return res.status(400).json({ message: "Email belum diverifikasi. Silakan verifikasi email terlebih dahulu." });
      }

      // Check if verification is still valid
      if (new Date() > pending.expiresAt) {
        pendingVerifications.delete(validatedData.email);
        return res.status(400).json({ message: "Verifikasi email sudah kadaluarsa. Silakan verifikasi ulang." });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }

      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user with emailVerified = true and selfie as profile image
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone ? `+62${validatedData.phone}` : undefined,
        password: hashedPassword,
        role: 'member',
        emailVerified: true,
        profileImageUrl: validatedData.selfieImage, // Save selfie as profile image
      });

      // Clear the pending verification
      pendingVerifications.delete(validatedData.email);

      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        res.json({ 
          message: "Registrasi berhasil! Selamat datang di Idachi Fitness!",
          user: { ...user, password: undefined }
        });
      });
    } catch (error: any) {
      console.error("Error during registration:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  // Resend verification code route
  app.post('/api/resend-verification-code', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email diperlukan" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      // Check if user is already verified
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email sudah diverifikasi" });
      }

      // Generate new 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store new verification code
      await storage.storeVerificationCode(email, verificationCode);
      
      // Send verification email
      const { sendVerificationEmail } = await import('./email/resend');
      await sendVerificationEmail(email, verificationCode);

      res.json({ 
        message: "Kode verifikasi baru telah dikirim ke email Anda",
        success: true
      });
    } catch (error: any) {
      console.error("Error during resend verification:", error);
      res.status(500).json({ message: error.message || "Gagal mengirim ulang kode verifikasi" });
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
      const emailResult = await sendPasswordResetEmail(validatedData.email, resetToken);
      
      // Check if email was sent successfully
      if (emailResult?.error) {
        console.error('[Forgot Password] Email sending failed:', emailResult.error);
        return res.status(500).json({ 
          message: "Terjadi kesalahan saat mengirim email. Silakan hubungi administrator.",
          details: emailResult.error.message 
        });
      }
      
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

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: error.message || "Gagal mengambil notifikasi" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await storage.markNotificationAsRead(id, userId);
      res.json({ message: "Notifikasi ditandai sebagai dibaca" });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: error.message || "Gagal menandai notifikasi" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "Semua notifikasi ditandai sebagai dibaca" });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: error.message || "Gagal menandai semua notifikasi" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await storage.deleteNotification(id, userId);
      res.json({ message: "Notifikasi berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: error.message || "Gagal menghapus notifikasi" });
    }
  });

  // Push Subscription routes
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const subscription = await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: "Subscription berhasil disimpan", subscription });
    } catch (error: any) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: error.message || "Gagal menyimpan subscription" });
    }
  });

  app.delete('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint required" });
      }

      await storage.deletePushSubscription(endpoint, userId);
      res.json({ message: "Subscription berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ message: error.message || "Gagal menghapus subscription" });
    }
  });

  app.get('/api/push/public-key', async (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ message: "VAPID keys not configured" });
    }
    res.json({ publicKey });
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
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error?.stack || error);
      const status = error?.status || error?.statusCode || 500;
      const message = error?.message || (status === 503 ? "Service Unavailable" : "Failed to fetch dashboard data");
      res.status(status).json({ message });
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
    } catch (error: any) {
      // Log full error stack for debugging
      console.error("Error generating QR code:", error?.stack || error);

      // In development include error.message in response to help debugging in the browser
      const responsePayload: any = { message: "Failed to generate QR code" };
      if (process.env.NODE_ENV === "development") {
        responsePayload.error = error?.message || String(error);
      }

      res.status(500).json(responsePayload);
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
      
      // Add last check-in and activity info to each member
      const membersWithActivity = await Promise.all(
        members.map(async (member) => {
          const checkIns = await storage.getUserCheckIns(member.id, 1);
          const lastCheckIn = checkIns[0];
          
          let daysInactive = null;
          if (lastCheckIn?.checkInTime) {
            const now = new Date();
            const lastCheckInDate = new Date(lastCheckIn.checkInTime);
            const diffTime = now.getTime() - lastCheckInDate.getTime();
            daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }
          
          return {
            ...member,
            lastCheckIn: lastCheckIn?.checkInTime || null,
            daysInactive,
          };
        })
      );
      
      res.json(membersWithActivity);
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

  // Admin: send WhatsApp message to a member
  app.post('/api/admin/whatsapp/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { memberId, phone, message, previewUrl } = req.body || {};
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Pesan tidak boleh kosong' });
      }

      let targetPhone: string | undefined;
      if (memberId) {
        const target = await storage.getUser(memberId);
        if (!target) return res.status(404).json({ message: 'Member tidak ditemukan' });
  targetPhone = normalizePhone((target as any).phone || undefined);
      } else {
        targetPhone = normalizePhone(phone);
      }

      if (!targetPhone) {
        return res.status(400).json({ message: 'Nomor WhatsApp tidak valid atau tidak tersedia' });
      }

      const result = await sendWhatsAppText(targetPhone, message.trim(), Boolean(previewUrl));
      res.json({ success: true, result });
    } catch (error: any) {
      const status = error?.status || error?.statusCode || 500;
      res.status(status).json({ message: error?.message || 'Gagal mengirim pesan WhatsApp' });
    }
  });

  // Admin: send Email message to a member
  app.post('/api/admin/email/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

  const { memberId, email, subject, message, ctaText, ctaUrl } = req.body || {};
      if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
        return res.status(400).json({ message: 'Subject tidak boleh kosong' });
      }
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Pesan tidak boleh kosong' });
      }

      let targetEmail: string | undefined;
      if (memberId) {
        const target = await storage.getUser(memberId);
        if (!target) return res.status(404).json({ message: 'Member tidak ditemukan' });
        targetEmail = (target as any).email || undefined;
      } else {
        targetEmail = email;
      }

      if (!targetEmail) {
        return res.status(400).json({ message: 'Email tidak valid atau tidak tersedia' });
      }

  const { client, fromEmail, replyTo } = getResendClientForAdmin();

      const html = (ctaText && ctaUrl)
        ? buildBrandedEmailHtmlWithCta(subject.trim(), textToSafeHtml(message), String(ctaText), String(ctaUrl))
        : buildBrandedEmailHtml(subject.trim(), textToSafeHtml(message));

      const payload: any = {
        from: fromEmail,
        to: targetEmail,
        subject: subject.trim(),
        html,
        tags: [{ name: 'stream', value: 'admin' }],
      };
      if (replyTo) payload.reply_to = replyTo;
      const result = await (client as any).emails.send(payload);
      // Log for operations visibility (non-sensitive)
      console.log(`[Email] Admin send -> to: ${targetEmail}, from: ${fromEmail}, subject: ${subject.trim()}`);
      if (result && (result as any).id) {
        console.log(`[Email] Resend id: ${(result as any).id}`);
      }

      res.json({ success: true, fromEmailUsed: fromEmail, result });
    } catch (error: any) {
      const status = error?.status || error?.statusCode || 500;
      res.status(status).json({ message: error?.message || 'Gagal mengirim email' });
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
      // Prevent deletion if member still has an active membership
      try {
        const m = await storage.getUserMembership(id);
        if (m && (m as any).status === 'active') {
          return res.status(409).json({ message: 'Tidak dapat menghapus member dengan status membership aktif. Batalkan atau tunggu membership berakhir terlebih dahulu.' });
        }
      } catch (_) {
        // If membership lookup fails, continue to safe path (delete may still be allowed)
      }
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

      // Get booking details before updating
      const bookings = await storage.getAllClassBookings();
      const booking = bookings.find(b => b.id === id);

      await storage.updateClassBookingStatus(id, status);

      // Create notification when booking is confirmed or attended
      if (booking && (status === 'attended' || status === 'booked')) {
        const notificationTitle = status === 'attended' 
          ? 'Class Booking Dikonfirmasi'
          : 'Class Booking Berhasil';
        const notificationMessage = status === 'attended'
          ? `Booking Anda untuk class "${booking.gymClass.name}" telah dikonfirmasi oleh admin.`
          : `Booking Anda untuk class "${booking.gymClass.name}" berhasil terdaftar.`;

        await sendNotificationWithPush(booking.userId, {
          userId: booking.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'booking_confirmed',
          relatedId: booking.id,
          isRead: false,
        });
      }

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

      // Check membership status & account active
      const membership = await storage.getUserMembership(memberUser.id);
      const now = new Date();
      const hasActiveMembership = membership && new Date(membership.endDate) > now;

      if (memberUser.active === false) {
        return res.json({
          success: false,
          user: memberUser,
          membership,
          message: 'Akun sedang CUTI. Silakan aktifkan kembali untuk melakukan check-in.'
        });
      }

      // If no active membership, return failure response with member info
      if (!hasActiveMembership) {
        return res.json({
          success: false,
          user: memberUser,
          membership,
          message: 'Belum terdaftar membership aktif atau membership sudah expired'
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

  // Admin Check-in preview (no creation) — returns member info only
  app.post('/api/admin/checkin/preview', isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      if (!qrCode) {
        return res.status(400).json({ success: false, message: 'QR code is required' });
      }

      const now = new Date();
      let memberUser = await storage.getUserByPermanentQrCode(qrCode);
      let isOneTimeQr = false;
      let normalizedQr = qrCode;

      if (!memberUser) {
        const oneTimeQr = await storage.validateOneTimeQrCode(qrCode);
        if (oneTimeQr) {
          if (oneTimeQr.status === 'used') {
            return res.status(400).json({ success: false, message: 'QR code sudah pernah digunakan' });
          }
          if (oneTimeQr.status === 'expired' || oneTimeQr.expiresAt < now) {
            return res.status(400).json({ success: false, message: 'QR code sudah kadaluarsa. Silakan generate QR baru' });
          }
          memberUser = await storage.getUser(oneTimeQr.userId);
          isOneTimeQr = true;
          normalizedQr = qrCode;
        }
      }

      if (!memberUser) {
        return res.status(404).json({ success: false, message: 'QR code tidak valid atau member tidak ditemukan' });
      }

      // Check membership & CUTI
      const membership = await storage.getUserMembership(memberUser.id);
      if (!membership || new Date(membership.endDate) <= now || membership.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Membership tidak aktif' });
      }

      // Optional: handle special user states like leave/pause if implemented in the future
      // Enrich preview with last check-in info
      let lastCheckIn: any = null;
      try {
        const recent = await storage.getUserCheckIns(memberUser.id, 1);
        lastCheckIn = recent && recent.length > 0 ? recent[0] : null;
      } catch {}

      return res.json({
        success: true,
        user: memberUser,
        membership,
        isOneTimeQr,
        qrCode: normalizedQr,
        lastCheckIn,
      });
    } catch (error) {
      console.error("Error in admin check-in preview:", error);
      res.status(500).json({ success: false, message: 'Failed to preview check-in' });
    }
  });

  // Admin Check-in approve (creates the check-in with optional lockerNumber)
  app.post('/api/admin/checkin/approve', isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode, lockerNumber } = req.body as { qrCode?: string; lockerNumber?: string };
      if (!qrCode) {
        return res.status(400).json({ success: false, message: 'QR code is required' });
      }

      const now = new Date();
      let memberUser = await storage.getUserByPermanentQrCode(qrCode);
      let isOneTimeQr = false;

      if (!memberUser) {
        const oneTimeQr = await storage.validateOneTimeQrCode(qrCode);
        if (!oneTimeQr) {
          return res.status(404).json({ success: false, message: 'QR code tidak valid' });
        }
        if (oneTimeQr.status === 'used') {
          return res.status(400).json({ success: false, message: 'QR code sudah pernah digunakan' });
        }
        if (oneTimeQr.status === 'expired' || oneTimeQr.expiresAt < now) {
          return res.status(400).json({ success: false, message: 'QR code sudah kadaluarsa. Silakan generate QR baru' });
        }
        memberUser = await storage.getUser(oneTimeQr.userId);
        isOneTimeQr = true;
      }

      if (!memberUser) {
        return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
      }

      // Validate membership & CUTI
      const membership = await storage.getUserMembership(memberUser.id);
      if (!membership || new Date(membership.endDate) <= now || membership.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Membership tidak aktif' });
      }
      // Optional: handle special user states like leave/pause if implemented in the future

      // Check if user already has an active check-in
      const existing = await storage.getUserCheckIns(memberUser.id, 1);
      const hasActive = existing[0] && existing[0].status === 'active';
      let created;
      if (hasActive) {
        // Already active: just return the existing, optionally in the future could update locker
        created = existing[0];
      } else {
        const checkInQr = randomUUID();
        created = await storage.createCheckIn({
          userId: memberUser.id,
          qrCode: checkInQr,
          status: 'active',
          lockerNumber: lockerNumber || null as any,
        } as any);
      }

      // Mark one-time QR as used after successful creation
      if (isOneTimeQr) {
        try {
          await storage.markQrCodeAsUsed(qrCode);
        } catch (err) {
          console.error('[Admin Check-in] Warning: Could not mark QR as used:', err);
        }
      }

      return res.json({
        success: true,
        checkIn: created,
        user: memberUser,
        membership,
      });
    } catch (error) {
      console.error('Error approving check-in:', error);
      res.status(500).json({ success: false, message: 'Failed to approve check-in' });
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

  // Promotions (member-visible) with simple ETag caching
  app.get('/api/member/promotions', isAuthenticated, async (req: any, res) => {
    try {
      const promos = await storage.getActivePromotions();
      const body = JSON.stringify(promos);
      // Weak ETag based on body hash (use sha256 to avoid environments where sha1 may be disabled/FIPS)
      let etag: string | undefined;
      try {
        etag = 'W/"' + createHash('sha256').update(body).digest('base64') + '"';
      } catch (e) {
        console.warn('ETag generation failed, continuing without ETag:', e);
      }

      if (etag) {
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
          res.status(304).end();
          return;
        }
        res.setHeader('ETag', etag);
      }

      // Cache for 60s on client; allow intermediaries to cache safely
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.json(promos);
    } catch (error) {
      console.error('Error fetching member promotions:', error);
      res.status(500).json({ message: 'Failed to fetch promotions' });
    }
  });

  // Admin Promotions CRUD
  app.get('/api/admin/promotions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const promos = await storage.getAllPromotions();
      // Admin view also sends caching hints, but no 304 to avoid staleness while editing
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.json(promos);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({ message: 'Failed to fetch promotions' });
    }
  });

  app.post('/api/admin/promotions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const payload = insertPromotionSchema.partial({
        startsAt: true,
        endsAt: true,
        imageUrl: true,
        cta: true,
        ctaHref: true,
        sortOrder: true,
        isActive: true,
      }).required({ title: true }).parse(req.body);
      const created = await storage.createPromotion(payload as any);
      res.json(created);
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      res.status(400).json({ message: error.message || 'Failed to create promotion' });
    }
  });

  app.put('/api/admin/promotions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const id = req.params.id as string;
      const payload = insertPromotionSchema.partial().parse(req.body);
      await storage.updatePromotion(id, payload as any);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating promotion:', error);
      res.status(400).json({ message: error.message || 'Failed to update promotion' });
    }
  });

  app.delete('/api/admin/promotions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const id = req.params.id as string;
      await storage.deletePromotion(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      res.status(500).json({ message: 'Failed to delete promotion' });
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
        sessionCount: z.number().int().min(1, "Session count must be at least 1").optional().default(1),
        notes: z.string().optional(),
      });

      const validatedData = ptBookingSchema.parse(req.body);

      const booking = await storage.createPtBooking({
        userId,
        trainerId: validatedData.trainerId,
        bookingDate: new Date(validatedData.bookingDate),
        duration: validatedData.duration,
        sessionCount: validatedData.sessionCount,
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

      // Get booking details before updating
      const bookings = await storage.getAllPtBookings();
      const booking = bookings.find(b => b.id === id);

      await storage.updatePtBookingStatus(id, status);

      // Create notification when PT booking is confirmed or completed
      if (booking && (status === 'confirmed' || status === 'completed')) {
        const notificationTitle = status === 'confirmed'
          ? 'Sesi PT Dikonfirmasi'
          : 'Sesi PT Selesai';
        const notificationMessage = status === 'confirmed'
          ? `Sesi PT Anda dengan ${booking.trainer.name} telah dikonfirmasi oleh admin.`
          : `Sesi PT Anda dengan ${booking.trainer.name} telah selesai.`;

        await sendNotificationWithPush(booking.userId, {
          userId: booking.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'pt_booking_confirmed',
          relatedId: booking.id,
          isRead: false,
        });
      }

      res.json({ message: 'PT booking updated successfully' });
    } catch (error) {
      console.error("Error updating PT booking:", error);
      res.status(500).json({ message: "Failed to update PT booking" });
    }
  });

  // PT Session Package routes
  app.post('/api/pt-session-packages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const packageSchema = z.object({
        trainerId: z.string().min(1, "Trainer ID is required"),
        totalSessions: z.number().min(1, "Total sessions must be at least 1"),
        pricePerSession: z.string(),
      });

      const validatedData = packageSchema.parse(req.body);
      const totalPrice = (parseFloat(validatedData.pricePerSession) * validatedData.totalSessions).toFixed(2);

      const pkg = await storage.createPtSessionPackage({
        userId,
        trainerId: validatedData.trainerId,
        totalSessions: validatedData.totalSessions,
        usedSessions: 0,
        remainingSessions: validatedData.totalSessions,
        pricePerSession: validatedData.pricePerSession,
        totalPrice,
        status: 'active',
      });

      res.json(pkg);
    } catch (error: any) {
      console.error("Error creating PT session package:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create PT session package" });
    }
  });

  app.get('/api/pt-session-packages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const packages = await storage.getUserPtSessionPackages(userId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching PT session packages:", error);
      res.status(500).json({ message: "Failed to fetch PT session packages" });
    }
  });

  app.get('/api/pt-session-packages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pkg = await storage.getPtSessionPackageById(id);
      
      if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
      }
      
      res.json(pkg);
    } catch (error) {
      console.error("Error fetching PT session package:", error);
      res.status(500).json({ message: "Failed to fetch PT session package" });
    }
  });

  // PT Session Attendance routes
  app.post('/api/pt-session-attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const attendanceSchema = z.object({
        packageId: z.string().min(1, "Package ID is required"),
        sessionDate: z.string().min(1, "Session date is required"),
        notes: z.string().optional(),
      });

      const validatedData = attendanceSchema.parse(req.body);

      // Get package to validate and get session number
      const pkg = await storage.getPtSessionPackageById(validatedData.packageId);
      if (!pkg) {
        return res.status(404).json({ message: 'Package not found' });
      }

      if (pkg.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      if (pkg.remainingSessions <= 0) {
        return res.status(400).json({ message: 'No remaining sessions' });
      }

      // Get existing sessions to determine session number
      const existingSessions = await storage.getPackageAttendanceSessions(validatedData.packageId);
      const sessionNumber = existingSessions.length + 1;

      const attendance = await storage.createPtSessionAttendance({
        packageId: validatedData.packageId,
        userId,
        trainerId: pkg.trainerId,
        sessionDate: new Date(validatedData.sessionDate),
        sessionNumber,
        status: 'scheduled',
        notes: validatedData.notes,
        adminConfirmed: false,
      });

      res.json(attendance);
    } catch (error: any) {
      console.error("Error creating PT session attendance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid attendance data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create PT session attendance" });
    }
  });

  app.get('/api/pt-session-attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getUserPtAttendanceSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching PT session attendance:", error);
      res.status(500).json({ message: "Failed to fetch PT session attendance" });
    }
  });

  app.get('/api/pt-session-attendance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getPtSessionAttendanceById(id);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching PT session attendance:", error);
      res.status(500).json({ message: "Failed to fetch PT session attendance" });
    }
  });

  app.put('/api/pt-session-attendance/:id/check-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const session = await storage.getPtSessionAttendanceById(id);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      if (session.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      if (session.status === 'completed') {
        return res.status(400).json({ message: 'Session already completed' });
      }

      await storage.updatePtSessionAttendance(id, {
        checkInTime: new Date(),
        status: 'completed',
      });

      res.json({ message: 'Checked in successfully' });
    } catch (error) {
      console.error("Error checking in PT session:", error);
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  // Admin PT session attendance routes
  app.get('/api/admin/pt-session-packages', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Get all users' packages
      const allUsers = await storage.getAllUsers();
      const allPackages = [];
      
      for (const u of allUsers) {
        const userPackages = await storage.getUserPtSessionPackages(u.id);
        allPackages.push(...userPackages.map(pkg => ({
          ...pkg,
          user: u,
        })));
      }

      res.json(allPackages);
    } catch (error) {
      console.error("Error fetching PT session packages:", error);
      res.status(500).json({ message: "Failed to fetch PT session packages" });
    }
  });

  app.get('/api/admin/pt-session-attendance', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Get all users' sessions
      const allUsers = await storage.getAllUsers();
      const allSessions = [];
      
      for (const u of allUsers) {
        const userSessions = await storage.getUserPtAttendanceSessions(u.id);
        allSessions.push(...userSessions.map(session => ({
          ...session,
          user: u,
        })));
      }

      res.json(allSessions);
    } catch (error) {
      console.error("Error fetching PT session attendance:", error);
      res.status(500).json({ message: "Failed to fetch PT session attendance" });
    }
  });

  app.put('/api/admin/pt-session-attendance/:id/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.id;
      const user = await storage.getUser(adminId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const session = await storage.getPtSessionAttendanceById(id);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      if (session.adminConfirmed) {
        return res.status(400).json({ message: 'Session already confirmed' });
      }

      // Confirm attendance
      await storage.confirmPtSessionAttendance(id, adminId);

      // Update package used sessions
      const pkg = await storage.getPtSessionPackageById(session.packageId);
      if (pkg) {
        const newUsedSessions = (pkg.usedSessions || 0) + 1;
        const newRemainingSessions = pkg.totalSessions - newUsedSessions;
        
        await storage.updatePtSessionPackage(session.packageId, {
          usedSessions: newUsedSessions,
          remainingSessions: newRemainingSessions,
          status: newRemainingSessions <= 0 ? 'completed' : 'active',
        });
      }

      // Create notification
      await sendNotificationWithPush(session.userId, {
        userId: session.userId,
        title: 'Sesi PT Dikonfirmasi',
        message: `Sesi PT Anda dengan ${session.trainer.name} telah dikonfirmasi oleh admin.`,
        type: 'pt_session_confirmed',
        relatedId: session.id,
        isRead: false,
      });

      res.json({ message: 'Session confirmed successfully' });
    } catch (error) {
      console.error("Error confirming PT session:", error);
      res.status(500).json({ message: "Failed to confirm session" });
    }
  });

  // Inactivity reminder endpoint
  app.post('/api/admin/send-inactivity-reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { daysInactive = 7 } = req.body;
      
      const reminderCount = await storage.sendInactivityReminders(daysInactive);
      
      res.json({ 
        message: `Berhasil mengirim ${reminderCount} reminder ke member yang tidak aktif`,
        count: reminderCount,
        daysInactive
      });
    } catch (error) {
      console.error("Error sending inactivity reminders:", error);
      res.status(500).json({ message: "Failed to send inactivity reminders" });
    }
  });

  // Get inactive members endpoint
  app.get('/api/admin/inactive-members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const daysInactive = parseInt(req.query.days as string) || 7;
      
      const inactiveMembers = await storage.getInactiveMembers(daysInactive);
      
      res.json({ 
        members: inactiveMembers,
        count: inactiveMembers.length,
        daysInactive
      });
    } catch (error) {
      console.error("Error fetching inactive members:", error);
      res.status(500).json({ message: "Failed to fetch inactive members" });
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
