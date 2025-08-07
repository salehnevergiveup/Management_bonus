# Management Bonus Platform

> **Enterprise Business Management Platform** • **Next.js 15** • **TypeScript**

A comprehensive business management platform built with Next.js, designed to handle complex business operations including bonus management, player management, process automation, and financial operations with enterprise-grade security and scalability.

## ✨ Core Features

### 🎯 **Player Management System**
- **📥 Bulk Player Import** - Import up to 10,000 players via CSV with background processing
- **🔍 Smart Validation** - Checks for existing players and transfer account availability
- **📊 Failed Records Management** - Export failed imports with detailed error tracking
- **⚡ Non-blocking UI** - Fire-and-forget import processing with real-time notifications
- **🛡️ Rate Limiting** - 2-minute cooldown, 1 concurrent import per user, 10 system-wide
- **📈 Daily Limits** - 20,000 records per user per day with intelligent quota management

### 💰 **Bonus Management System**
- **🎁 Bonus Creation & Management** - Comprehensive bonus system with multiple types
- **📋 Bonus Assignment** - Assign bonuses to players with tracking
- **📊 Bonus Analytics** - Track bonus distribution and effectiveness
- **🔄 Bonus Status Tracking** - Monitor active, expired, and pending bonuses

### 🔄 **Process Management & Automation**
- **⚙️ Process Creation** - Create automated business processes
- **📊 Process Monitoring** - Real-time status tracking (Pending, Processing, Success, On Hold, Failed)
- **🔄 Process Control** - Start, pause, resume, and terminate processes
- **📈 Progress Tracking** - Visual progress indicators with detailed status updates
- **🔔 Process Notifications** - Real-time alerts for process status changes

### 🎯 **Match Management System**
- **🔗 Match Creation** - Create player-account matches with validation
- **📊 Match Status Tracking** - Monitor match status (Pending, Success, Failed)
- **📤 CSV Export** - Export all matches or failed matches with detailed data
- **🔄 Match Refiltering** - Re-process matches with updated criteria
- **📈 Match Analytics** - Comprehensive match statistics and reporting

### 💳 **Transfer Account Management**
- **🏦 Account Types** - Main accounts and sub-accounts with hierarchical structure
- **📊 Account Status** - Track account status (Success, Failed, Pending)
- **🔄 Account Operations** - Create, update, and manage transfer accounts
- **📈 Account Analytics** - Monitor account performance and usage

### 📊 **Account Turnover Management**
- **💰 Turnover Tracking** - Monitor financial turnovers with detailed records
- **📈 Turnover Analytics** - Comprehensive reporting and analysis
- **🔄 Turnover Operations** - Create and manage turnover records
- **📊 Turnover Export** - Export turnover data for external analysis

### 👥 **User Management & Authentication**
- **🔐 Role-Based Access Control** - Admin and Management roles with granular permissions
- **👤 User Profiles** - Complete user profile management
- **🔑 API Key Management** - Generate and manage API keys for external integrations
- **🛡️ Security Features** - Multi-factor authentication, session management
- **📊 User Analytics** - Track user activity and system usage

### 📋 **Request Management System**
- **📝 Request Creation** - Submit and track business requests
- **✅ Request Approval** - Multi-level approval workflows
- **📊 Request Status** - Track request status (Accepted, Rejected, Pending)
- **📈 Request Analytics** - Monitor request patterns and processing times

### 🔔 **Notification System**
- **📱 Real-time Notifications** - Live notification updates
- **📊 Notification Management** - Mark as read/unread, notification preferences
- **🔔 Notification Types** - Error, Success, Warning, Info notifications
- **📈 Notification Analytics** - Track notification engagement

### 📡 **External API Integration System**
- **🔑 API Key Authentication** - Secure external app integration with API keys
- **📱 SMS Integration** - External SMS sending with `/rewardreach` and `/unclaim` endpoints
- **🌐 CORS Support** - Cross-origin requests enabled for external applications
- **🛡️ Permission-Based Access** - Granular permissions for external integrations
- **📊 API Usage Tracking** - Monitor external API usage and performance
- **🔄 Background Processing** - Non-blocking API operations for high-volume requests
- **📝 Message Templating** - Dynamic SMS message templates with personalized content
- **📱 Malaysian Phone Format** - Automatic phone number formatting for Malaysian numbers
- **📈 SMS Logging** - Comprehensive SMS send logs with batch tracking

### 📊 **Dashboard & Analytics**
- **📈 Real-time Dashboard** - Live system metrics and KPIs
- **📊 Process Analytics** - Monitor system performance and process efficiency
- **📈 User Analytics** - Track user activity and system usage
- **📊 Financial Analytics** - Monitor financial operations and trends

### 🌐 **Multi-language Support**
- **🌍 Internationalization** - English and Chinese language support
- **🔄 Dynamic Language Switching** - Seamless language switching
- **📝 Localized Content** - All UI elements and messages localized

### 🎨 **Theme System**
- **🌙 Dark Mode** - Easy on the eyes for low-light environments
- **☀️ Light Mode** - Traditional bright interface
- **🖥️ System Mode** - Automatically follows your system preference
- **🔄 Theme Toggle** - Located in the top navigation bar
- **💾 Persistent** - Your theme preference is saved across sessions

## 🤖 Automation & External Integration

### 📡 **External API Requirements**

**API Key Authentication:**
- **Required Header:** `X-API-Key: your-api-key`
- **Permission:** `sms-send` for SMS endpoints
- **Application:** `loyalty app` for SMS integration
- **Expiration:** 90-day API key validity
- **Rate Limiting:** Configurable per application

**CORS Configuration:**
- **Allowed Origins:** All origins (`*`) for external integrations
- **Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, X-API-Key
- **Cache Duration:** 24 hours for preflight requests

**SMS Endpoints:**
- **Rewardreach:** `POST /api/external-app/sms/rewardreach`
- **Unclaim:** `POST /api/external-app/sms/unclaim`
- **Message Format:** Dynamic templating with personalized content
- **Phone Format:** Automatic Malaysian number formatting (60 prefix)
- **Processing:** Fire-and-forget background processing

### 🔄 **Automation Features**

**Background Processing:**
- **Non-blocking Operations** - UI remains responsive during heavy operations
- **Fire-and-Forget Pattern** - Immediate response with background processing
- **Progress Tracking** - Real-time status updates via Server-Sent Events
- **Error Handling** - Comprehensive error tracking and recovery
- **Batch Processing** - Efficient handling of large datasets

**Process Automation:**
- **Automated Workflows** - Business process automation
- **Event-Driven Architecture** - Real-time event processing
- **Webhook Integration** - External system notifications
- **Status Management** - Automated status transitions
- **Retry Mechanisms** - Automatic retry for failed operations

### 📱 **External API Usage Examples**

**SMS Integration Example:**
```javascript
// Rewardreach SMS
fetch('https://your-domain.com/api/external-app/sms/rewardreach', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify([
    {
      "phone_number": "60123456789",
      "UID": "123456",
      "bonus_amount": "500",
      "currency": "USD"
    }
  ])
})

// Unclaim SMS
fetch('https://your-domain.com/api/external-app/sms/unclaim', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify([
    {
      "phone_number": "60123456789",
      "UID": "123456",
      "unclaimAmount": "1000",
      "bonus_type": "Extra"
    }
  ])
})
```

**Expected Response:**
```json
{
  "success": true,
  "message": "SMS sending process started successfully",
  "summary": {
    "total_records": 1,
    "status": "processing"
  }
}
```

**Message Templates:**
- **Rewardreach:** `Dear {UID}, Claim WINBOX Extra B0nus credit now!`
- **Unclaim:** `Dear {UID}, Claim WINBOX Extra B0nus credit now! Balance: {unclaimAmount}`
- **Dynamic Fields:** Any additional key-value pairs added automatically
- **Phone Formatting:** Automatic Malaysian format (60 prefix)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **MySQL** 8.0+
- **Git**

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd Management_bonus

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Set up database
npm run db:generate
npm run db:push
npm run db:seed

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
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | MySQL with Prisma ORM |
| **Authentication** | NextAuth.js with role-based access |
| **Styling** | Tailwind CSS with custom components |
| **Deployment** | AWS EC2, Nginx, SSL |
| **CI/CD** | GitHub Actions with automated deployment |

## 📁 Project Structure

```
Management_bonus/
├── app/                    # Next.js app directory
│   ├── (protected)/       # Protected routes with authentication
│   │   ├── dashboard/     # Main dashboard
│   │   ├── players/       # Player management
│   │   ├── bonuses/       # Bonus management
│   │   ├── processes/     # Process automation
│   │   ├── matches/       # Match management
│   │   ├── users/         # User management
│   │   ├── requests/      # Request management
│   │   ├── transfer-accounts/ # Transfer account management
│   │   ├── account-turnovers/ # Turnover management
│   │   ├── notifications/ # Notification system
│   │   ├── history/       # System history
│   │   ├── profile/       # User profiles
│   │   └── api-keys/      # API key management
│   ├── api/               # API routes
│   └── login/             # Authentication pages
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   └── matches/          # Match-specific components
├── lib/                  # Utilities and configurations
├── prisma/               # Database schema and migrations
│   ├── migrations/       # Database migration files
│   └── seeders/         # Database seeding scripts
├── constants/            # Application constants and enums
├── types/                # TypeScript type definitions
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
├── middlewares/          # Authentication middlewares
├── public/               # Static assets
├── docs/                 # Documentation
│   └── deployment/       # Deployment documentation
└── README.md            # This file
```

## 🚀 Deployment

### Production Deployment

For complete production deployment instructions, see our comprehensive guides:

| Resource | Description |
|----------|-------------|
| [📖 **Deployment Guide**](./docs/deployment/deployment.md) | Complete step-by-step deployment documentation |
| [🖥️ **Interactive Guide**](https://managementdoc.netlify.app/document.html) | Visual deployment interface with clickable steps (External Link) |

### Quick Deploy

**Automatic Deployment:**
- Push to `main` branch triggers automatic deployment
- Push to `dev` branch triggers development deployment

**Manual Deployment:**
1. Go to [GitHub Actions](../../actions)
2. Select "Main Deployment Pipeline" or "Dev Deployment Pipeline"
3. Click "Run workflow"

### Infrastructure

- **Application Server**: AWS EC2 (t2.small)
- **Database Server**: AWS EC2 (t2.micro)
- **Web Server**: Nginx with SSL
- **SSL Certificates**: Automated Let's Encrypt
- **Network**: Secure VPC with public/private subnets
- **CI/CD**: GitHub Actions with automated testing and deployment

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
npm run migrate:deploy   # Deploy database migrations
npm run migrate:dev      # Create new migration
npm run migrate:status   # Check migration status
npm run db:seed          # Seed database with sample data

# Import/Export
# Player import via CSV (up to 10,000 records)
# Match export (all or failed matches)
# Failed import export with detailed error tracking
```

## 🔐 Security Features

- **🔑 Role-Based Access Control** - Granular permissions for different user roles
- **🛡️ API Key Management** - Secure API access with key rotation
- **🔐 Multi-Factor Authentication** - Enhanced security for sensitive operations
- **📊 Audit Logging** - Comprehensive activity tracking
- **🛡️ Rate Limiting** - Protection against abuse and DDoS
- **🔒 Session Management** - Secure session handling with automatic cleanup

## 📊 Performance Features

- **⚡ Background Processing** - Non-blocking operations for large datasets
- **📈 Batch Processing** - Efficient handling of bulk operations
- **🔄 Real-time Updates** - Live notifications and status updates
- **📊 Caching** - Intelligent caching for improved performance
- **🛡️ Error Handling** - Graceful error management with user feedback

## 🌟 Key Innovations

- **🔥 Fire-and-Forget Processing** - Immediate UI response with background processing
- **📊 Smart Rate Limiting** - Intelligent limits that prevent abuse while allowing legitimate use
- **🔄 Process Automation** - Automated business processes with real-time monitoring
- **📈 Comprehensive Analytics** - Detailed reporting and insights across all modules
- **🌍 Multi-language Support** - Seamless internationalization
- **🎨 Theme System** - Flexible theming with system preference detection

---

Built with ❤️ using [Next.js](https://nextjs.org/) and modern web technologies