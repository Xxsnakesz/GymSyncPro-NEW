# Project Structure

This document describes the structure of the GymSyncPro monorepo.

## Directory Structure

```
GymSyncPro-NEW/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── layout.tsx   # Root layout
│   │   │   ├── page.tsx     # Home page
│   │   │   ├── providers.tsx # React Query provider
│   │   │   └── globals.css  # Global styles
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── api/             # API client functions
│   │   ├── store/           # State management (Zustand/Redux)
│   │   └── lib/             # Utility functions
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   ├── next.config.js       # Next.js configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── tailwind.config.ts   # Tailwind CSS configuration
│
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── db/              # Database configuration
│   │   │   ├── index.ts     # Prisma client setup
│   │   │   └── seed.ts      # Database seed script
│   │   ├── routes/          # API route handlers
│   │   │   └── index.ts     # Route registration
│   │   ├── controllers/     # Request controllers
│   │   ├── middlewares/     # Express middlewares
│   │   │   └── auth.ts      # Authentication middleware
│   │   ├── services/        # Business logic services
│   │   ├── socket/          # WebSocket handlers (future)
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Prisma schema definition
│   │   └── migrations/      # Database migrations
│   ├── package.json         # Backend dependencies
│   └── tsconfig.json        # TypeScript configuration
│
├── nginx/                    # Nginx reverse proxy configuration
│   ├── nginx.conf           # Main nginx config
│   ├── conf.d/              # Site configurations
│   │   └── default.conf     # Default site config
│   └── ssl/                 # SSL certificates (not in git)
│
├── scripts/                  # Deployment and utility scripts
│   ├── deploy.sh            # Production deployment script
│   └── setup.sh             # Development setup script
│
├── docker-compose.yml        # Docker Compose configuration
├── .dockerignore            # Docker ignore patterns
├── .gitignore               # Git ignore patterns
├── package.json             # Root package.json (workspace)
├── README.md                # Main documentation
├── DEPLOYMENT.md            # Deployment guide
└── CONTRIBUTING.md          # Contribution guidelines
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: Passport.js + bcrypt
- **Session**: express-session + connect-pg-simple

### DevOps
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Process Management**: PM2 (optional)
- **CI/CD**: GitHub Actions (optional)

## Key Files

### Frontend
- `frontend/next.config.js` - Next.js configuration
- `frontend/tailwind.config.ts` - Tailwind CSS configuration
- `frontend/src/app/layout.tsx` - Root layout component
- `frontend/src/app/page.tsx` - Home page

### Backend
- `backend/src/index.ts` - Express server entry point
- `backend/src/routes/index.ts` - Route registration
- `backend/src/middlewares/auth.ts` - Authentication middleware
- `backend/prisma/schema.prisma` - Database schema

### Configuration
- `docker-compose.yml` - Docker services orchestration
- `nginx/nginx.conf` - Nginx main configuration
- `nginx/conf.d/default.conf` - Nginx site configuration
- `.env.example` - Environment variables template

## Database Schema

Main Prisma models:
- `User` - User accounts (admin, customer, owner)
- `MembershipPlan` - Membership plan definitions
- `Membership` - User memberships
- `Payment` - Payment transactions
- `CheckIn` - Gym check-ins
- `ClassBooking` - Class bookings
- `PersonalTrainer` - Personal trainers
- `PtBooking` - Personal training bookings
- `Feedback` - User feedback
- `Notification` - User notifications
- `Promotion` - Promotions and announcements

See `backend/prisma/schema.prisma` for complete schema definition.

## Development Workflow

1. **Setup**: Run `./scripts/setup.sh` to set up development environment
2. **Development**: Run `npm run dev` to start both frontend and backend
3. **Database**: Run migrations with `npm run db:migrate`
4. **Testing**: Test your changes locally
5. **Deployment**: Use `./scripts/deploy.sh` for production deployment

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `RESEND_API_KEY` - Email service API key
- `NEXT_PUBLIC_API_URL` - Frontend API URL
- `ALLOWED_ORIGINS` - CORS allowed origins

## Deployment Architecture

```
Internet
  ↓
Nginx (Port 80/443)
  ↓
├── Frontend (Next.js) - Port 3000
└── Backend (Express) - Port 5000
       ↓
   PostgreSQL - Port 5432
```

All services run in Docker containers orchestrated by Docker Compose.

## Next Steps

1. Migrate existing React components from `client/` to `frontend/`
2. Migrate existing Express routes from `server/` to `backend/`
3. Convert Drizzle queries to Prisma queries
4. Set up CI/CD pipeline
5. Configure monitoring and logging
6. Set up backup procedures

