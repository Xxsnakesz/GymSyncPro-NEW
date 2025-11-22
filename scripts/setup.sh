#!/bin/bash

# GymSyncPro Setup Script
# Initial setup for development environment

set -e

echo "🔧 Setting up GymSyncPro development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ is required. Current version: $(node -v)"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f .env ]; then
    echo "⚠️  Creating backend/.env from example..."
    cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/gymsyncpro?schema=public"
PORT=5000
NODE_ENV=development
SESSION_SECRET=dev-secret-change-in-production
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev
ALLOWED_ORIGINS=http://localhost:3000
EOF
fi
npm install
npx prisma generate
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -f .env.local ]; then
    echo "⚠️  Creating frontend/.env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
EOF
fi
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your database credentials"
echo "2. Update frontend/.env.local if needed"
echo "3. Run database migrations: cd backend && npm run db:migrate"
echo "4. Start development:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"

