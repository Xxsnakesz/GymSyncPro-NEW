# GymSyncPro - Full-Stack Gym Management System

A production-ready, scalable full-stack web application for monitoring sales targets and progress with a modular monorepo structure. Built with Next.js, PostgreSQL, and Prisma.

## 🏗️ Architecture

```
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
├── nginx/            # Nginx reverse proxy configuration
├── docker-compose.yml # Docker orchestration
└── README.md         # This file
```

## 🚀 Features

- **User Roles**: Admin, Customer, Owner
- **Modern UI**: Minimalist-modern design, mobile-responsive
- **Performance**: Fast loading times (<3s)
- **Production-Ready**: Docker automation, nginx reverse proxy
- **Database**: PostgreSQL with Prisma ORM
- **Sales Monitoring**: Track sales targets and progress

## 📋 Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- PostgreSQL (or use Docker)
- Git

## 🛠️ Development Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd GymSyncPro-NEW
```

### 2. Set up environment variables

Create `.env` files in both `backend/` and `frontend/` directories:

**backend/.env:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/gymsyncpro?schema=public"
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-in-production
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev
ALLOWED_ORIGINS=http://localhost:3000
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Install dependencies

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### 4. Set up database

```bash
cd backend
npx prisma migrate dev
# Optional: Seed database
npm run db:seed
```

### 5. Run development servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build
```

### Production Deployment on VPS

1. **Clone repository on VPS**
   ```bash
   git clone <repository-url>
   cd GymSyncPro-NEW
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file at root
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Build and start services**
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

5. **Set up SSL (optional but recommended)**
   - Place SSL certificates in `nginx/ssl/`
   - Update `nginx/conf.d/default.conf` with your domain
   - Uncomment HTTPS server block

6. **Configure firewall**
   ```bash
   # Allow HTTP and HTTPS
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## 📁 Project Structure

### Backend (`backend/`)
```
backend/
├── src/
│   ├── db/           # Database configuration (Prisma)
│   ├── routes/       # API route handlers
│   ├── controllers/  # Request controllers
│   ├── middlewares/  # Auth & other middlewares
│   ├── services/     # Business logic services
│   ├── utils/        # Utility functions
│   └── index.ts      # Express app entry point
├── prisma/
│   └── schema.prisma # Database schema
└── package.json
```

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── api/          # API client functions
│   ├── store/        # State management
│   └── lib/          # Utility functions
└── package.json
```

## 🔧 Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🌐 API Endpoints

The backend API is available at `/api`. Key endpoints include:

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users` - Get users (requires auth)
- `GET /api/memberships` - Get memberships
- ... (more endpoints to be added)

## 🗄️ Database Schema

The database schema is defined in `backend/prisma/schema.prisma`. Main models include:

- `User` - User accounts (Admin, Customer, Owner)
- `Membership` - Membership plans and subscriptions
- `Payment` - Payment transactions
- `CheckIn` - Gym check-ins
- `ClassBooking` - Class bookings
- `PersonalTrainer` - PT trainers and sessions
- ... (see schema.prisma for complete list)

## 🔐 Security

- Session-based authentication with Passport.js
- Password hashing with bcrypt
- Environment variables for sensitive data
- CORS configuration
- Input validation with Zod
- SQL injection protection via Prisma

## 📊 Monitoring & Logging

- Health check endpoints
- Request logging middleware
- Error handling and reporting
- Database connection monitoring

## 🚢 Deployment Checklist

- [ ] Set all environment variables
- [ ] Configure database connection
- [ ] Set up SSL certificates (for HTTPS)
- [ ] Configure domain DNS
- [ ] Set up firewall rules
- [ ] Run database migrations
- [ ] Seed initial data (if needed)
- [ ] Test all endpoints
- [ ] Monitor logs and errors
- [ ] Set up backups

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

MIT License

## 🆘 Support

For issues and questions, please open an issue on GitHub.

