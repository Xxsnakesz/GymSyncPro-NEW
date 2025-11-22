import type { Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import { db } from '../db';

const PgSession = connectPgSimple(session);

export async function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  
  if (!sessionSecret) {
    console.warn('⚠️  WARNING: Using default SESSION_SECRET in development. Set SESSION_SECRET env var for production!');
  }

  // Session setup
  app.use(
    session({
      store: new PgSession({
        pool: pool!,
        tableName: 'sessions',
        createTableIfMissing: true,
      }),
      secret: sessionSecret || 'dev-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.user.findFirst({
          where: {
            OR: [
              { username },
              { email: username },
              { phone: username },
            ],
          },
        });

        if (!user) {
          return done(null, false, { message: 'Email/Nomor Telepon/Username atau password salah' });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          return done(null, false, { message: 'Email/Nomor Telepon/Username atau password salah' });
        }

        // Check if email is verified (skip for admin users)
        if (user.role !== 'admin' && !user.emailVerified) {
          return done(null, false, { message: 'Email belum diverifikasi. Silakan cek email Anda untuk kode verifikasi' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await db.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

// Middleware to check if user is admin
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
}

// Middleware to check if user is owner
export function isOwner(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.role === 'owner') {
    return next();
  }
  res.status(403).json({ message: 'Owner access required' });
}

// Middleware to check if user is admin or owner
export function isAdminOrOwner(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user?.role === 'admin' || req.user?.role === 'owner')) {
    return next();
  }
  res.status(403).json({ message: 'Admin or Owner access required' });
}

