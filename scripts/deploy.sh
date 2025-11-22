#!/bin/bash

# GymSyncPro Deployment Script
# This script helps deploy the application to a VPS

set -e

echo "🚀 Starting GymSyncPro deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env file with your configuration before continuing.${NC}"
        exit 1
    else
        echo -e "${RED}.env.example file not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Pull latest changes (if git repository)
if [ -d .git ]; then
    echo "📥 Pulling latest changes..."
    git pull || echo -e "${YELLOW}Warning: Could not pull latest changes.${NC}"
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy || echo -e "${YELLOW}Warning: Database migrations may have failed. Check logs.${NC}"

# Check service health
echo "🏥 Checking service health..."
HEALTH_CHECK=$(curl -s http://localhost/api/health || echo "FAIL")
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed. Check logs: docker-compose logs backend${NC}"
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Service status:"
docker-compose ps
echo ""
echo "📝 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"

