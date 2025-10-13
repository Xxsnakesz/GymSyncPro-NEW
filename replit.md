# Idachi Fitness Gym Management System

## Overview

Idachi Fitness is a comprehensive gym management platform designed to streamline gym operations and enhance member experience. The system provides dual interfaces - a member portal for workout tracking, class bookings, and membership management, and an administrative dashboard for gym operations, member management, and business analytics. The platform supports modern payment processing, QR-based check-ins, class scheduling, and membership lifecycle management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client application uses React with TypeScript, built with Vite for development and bundling. The UI follows a component-based architecture using shadcn/ui components with Radix UI primitives and Tailwind CSS for styling. State management is handled through TanStack React Query for server state and React hooks for local state. Routing is implemented with Wouter for a lightweight solution.

#### UI/UX Design
The application features modern, responsive design with:
- **Authentication Pages**: Split-screen layouts with gradient backgrounds, glassmorphism effects, and hero sections featuring brand messaging. All forms include icon-enhanced inputs, password visibility toggles, and smooth transitions.
- **Password Security**: Real-time password strength indicators on registration forms with visual feedback (weak/medium/strong) based on length, character variety, and complexity.
- **Cookie Consent System**: GDPR-compliant cookie management with consent banner, granular preference controls, and persistent storage. Users can customize analytics, marketing, and preference cookies independently.
- **Responsive Design**: Mobile-first approach with adaptive layouts that progressively enhance for larger screens, ensuring optimal UX across all devices.

### Backend Architecture
The server uses Express.js with TypeScript in an ESM environment. The API follows RESTful patterns with route-based organization. Authentication is implemented using OpenID Connect (OIDC) with Replit's authentication service, utilizing Passport.js for session management. Session storage is handled by connect-pg-simple with PostgreSQL backing.

### Database Design
Data persistence uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema includes comprehensive entities for users, memberships, membership plans, gym classes, class bookings, check-ins, and payments. Relations are properly defined between entities, and the system supports both session storage and application data in the same database.

### Payment Integration
The system supports multiple payment gateways:
- **Stripe Integration**: For international payments with full subscription management
- **Midtrans Integration**: For Indonesian market payment processing
- **QRIS Support**: QR code-based payments popular in Indonesian market
Both payment systems are designed as optional modules that can be configured based on deployment requirements.

### Authentication & Authorization
Authentication uses OpenID Connect integration with Replit's identity provider. The system implements role-based access control with "member" and "admin" roles. Session management includes secure cookie handling and automatic session cleanup. Unauthorized access triggers automatic re-authentication flows.

### File Organization
The codebase follows a monorepo structure with clear separation:
- `/client` - React frontend application
- `/server` - Express backend API
- `/shared` - Shared TypeScript schemas and types
This structure enables type sharing between frontend and backend while maintaining clear boundaries.

## External Dependencies

### Core Infrastructure
- **Neon Database**: PostgreSQL hosting with connection pooling via @neondatabase/serverless
- **Replit Authentication**: OpenID Connect provider for user authentication
- **Replit Development Tools**: Hot reloading, error overlays, and development utilities

### Payment Providers
- **Stripe**: International payment processing with webhook support
- **Midtrans**: Indonesian payment gateway supporting multiple local payment methods
- **QRIS**: QR code payment system integration

### UI & Styling Framework
- **shadcn/ui**: Pre-built component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **Radix UI**: Headless component primitives for accessibility and behavior

### Development & Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire stack
- **Drizzle ORM**: Type-safe database operations with migration support
- **TanStack React Query**: Server state management and caching

### Email Service
- **Resend**: Transactional email service for password reset and notifications
  - **Configuration Required**: Domain verification needed at https://resend.com/domains
  - **Current Issue**: The configured sender domain (gmail.com) is not verified, causing email delivery failures
  - **Impact**: Password reset emails are not being delivered to users
  - **Solution**: Verify a custom domain in Resend or use Resend's default sender domain