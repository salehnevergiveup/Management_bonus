# Management App

> **Modern Business Management Platform** • **Next.js**

A comprehensive management application built with Next.js, designed to streamline business operations with intuitive user interfaces and robust backend functionality.

## ✨ Features

- **👥 User Management** - Complete user administration with role-based access control
- **📋 Request Management** - Handle and track business requests with approval workflows  
- **💳 Transfer Account Management** - Manage financial transfer accounts and transactions
- **🔐 Authentication & Authorization** - Secure login system with multi-role support
- **📊 Management Dashboard** - Centralized control panel for business operations
- **🌐 Multi-language Support** - English and Chinese language support
- **🔔 Notification System** - Real-time notifications and alerts
- **📱 Responsive Design** - Works seamlessly across all devices

## 🚀 Quick Start

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd management-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Configuration

Create `.env.local` with your configuration:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/management_db"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Application
NODE_ENV="development"
PORT=3000
```

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14, React, TypeScript |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | MySQL with Prisma ORM |
| **Authentication** | NextAuth.js |
| **Styling** | Tailwind CSS |
| **Deployment** | AWS EC2, Nginx, SSL |

## 📁 Project Structure

```
management-app/
├── app/                    # Next.js app directory
├── components/             # Reusable UI components
├── lib/                    # Utilities and configurations
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── docs/
│   └── deployment/         # Deployment documentation
│       ├── deployment.md   # Complete deployment guide
│       └── document.html   # Interactive deployment guide
└── README.md              # This file
```

## 🚀 Deployment

### Production Deployment

For complete production deployment instructions, see our comprehensive guides:

| Resource | Description |
|----------|-------------|
| [📖 **Deployment Guide**](./docs/deployment/deployment.md) | Complete step-by-step deployment documentation |
| [🖥️ **Interactive Guide**](https://managementdoc.netlify.app/document.html) | Visual deployment interface with clickable steps |

### Quick Deploy

**Automatic Deployment:**
- Push to `main` branch triggers automatic deployment

**Manual Deployment:**
1. Go to [GitHub Actions](../../actions)
2. Select "Main Deployment Pipeline"
3. Click "Run workflow"

### Infrastructure

- **Application Server**: AWS EC2 (t2.small)
- **Database Server**: AWS EC2 (t2.micro)
- **Web Server**: Nginx with SSL
- **SSL Certificates**: Automated Let's Encrypt
- **Network**: Secure VPC with public/private subnets

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run code linting

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data
```

---

Built with ❤️ using [Next.js](https://nextjs.org/)
