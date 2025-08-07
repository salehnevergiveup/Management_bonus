# Deployment Guide

> **Version:** 2.1 • **Platform:** AWS Infrastructure

## Table of Contents

- [Overview](#overview)
- [Infrastructure Setup](#1-infrastructure-setup)
- [GitHub Configuration](#2-github-configuration)
- [CI/CD Pipeline](#3-cicd-pipeline)
- [Deployment Execution](#4-deployment-execution)
- [Operations & Troubleshooting](#5-operations--troubleshooting)

## Overview

This document provides comprehensive instructions for deploying our Next.js application to AWS production infrastructure using automated GitHub Actions workflows. The deployment implements enterprise-grade security, SSL certificate management, and operational best practices.

### Architecture Summary

- **Application Tier**: EC2 t2.small (public subnet)
- **Database Tier**: EC2 t2.micro (private subnet)
- **Web Server**: Nginx with SSL termination
- **SSL Management**: Automated Let's Encrypt certificates
- **Deployment**: GitHub Actions CI/CD pipeline

---

## 1. Infrastructure Setup

### Prerequisites

- AWS Account with appropriate IAM permissions
- Domain name with DNS management access
- GitHub repository with deployment workflows

### 1.1 VPC Configuration

Create a new Virtual Private Cloud for network isolation:

```bash
# Navigate to AWS VPC Console → Create VPC
Name: production-vpc
IPv4 CIDR: 10.0.0.0/16
Tenancy: Default
```

**Rationale**: The `/16` CIDR block provides 65,536 IP addresses, allowing for future scaling while maintaining proper network segmentation.

### 1.2 Subnet Architecture

#### Public Subnet (DMZ)
```bash
# VPC Dashboard → Subnets → Create subnet
Name: public-subnet-1a
VPC: production-vpc
Availability Zone: us-east-1a (adjust for your region)
IPv4 CIDR: 10.0.1.0/24
```

#### Private Subnet (Database Tier)
```bash
# Create second subnet
Name: private-subnet-1a
VPC: production-vpc
Availability Zone: us-east-1a (same as public)
IPv4 CIDR: 10.0.2.0/24
```

### 1.3 Internet Gateway Setup

```bash
# VPC Dashboard → Internet Gateways → Create internet gateway
Name: production-igw

# Attach to VPC
Actions → Attach to VPC → Select production-vpc
```

### 1.4 Route Table Configuration

#### Public Route Table
```bash
# Route Tables → Create route table
Name: public-rt
VPC: production-vpc

# Configure routes
Routes tab → Edit routes → Add route:
Destination: 0.0.0.0/0
Target: Internet Gateway → production-igw

# Associate with subnet
Subnet associations → Edit → Select public-subnet-1a
```

### 1.5 NAT Gateway (Outbound Access)

```bash
# NAT Gateways → Create NAT gateway
Name: production-nat
Subnet: private-subnet-1a
Connectivity type: Public
Elastic IP: Allocate new

# Configure private route table
Find route table for private subnet → Edit routes:
Destination: 0.0.0.0/0
Target: NAT Gateway → production-nat
```

### 1.6 EC2 Instance Deployment

#### Database Server Configuration
```bash
# EC2 Console → Launch Instance
Name: production-database
AMI: Ubuntu Server 22.04 LTS
Instance type: t2.micro
Key pair: Create new or select existing
```

**Network Configuration:**
- VPC: production-vpc
- Subnet: private-subnet-1a
- Auto-assign public IP: **Disable**
- Security group: database-sg

**Security Group Rules:**
- SSH (22): Source VPC CIDR (10.0.0.0/16)
- MySQL (3306): Source VPC CIDR (10.0.0.0/16)

#### Application Server Configuration
```bash
# Launch Instance
Name: production-app
AMI: Ubuntu Server 22.04 LTS
Instance type: t2.small
Key pair: Same as database server
```

**Network Configuration:**
- VPC: production-vpc
- Subnet: public-subnet-1a
- Auto-assign public IP: **Enable**
- Security group: application-sg

**Security Group Rules:**
- SSH (22): Source 0.0.0.0/0
- HTTP (80): Source 0.0.0.0/0
- HTTPS (443): Source 0.0.0.0/0

### 1.7 Information Collection

After instance launch, document these critical values:

| Component | Information Required |
|-----------|---------------------|
| **Application Server** | Public IPv4 address, Private IPv4 address |
| **Database Server** | Private IPv4 address only |
| **SSH Key Pair** | Private key (.pem) file contents |

> ⚠️ **Security Note**: Store the private key securely and never commit it to version control.

---

## 2. GitHub Configuration

### 2.1 Repository Secrets

Navigate to: **Repository → Settings → Secrets and variables → Actions**

#### Infrastructure Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `EC2_HOST` | Public IP of application server | `3.15.123.456` |
| `EC2_SSH_KEY` | Complete private key file contents | `-----BEGIN RSA PRIVATE KEY-----...` |
| `EC2_USER` | EC2 instance username | `ubuntu` |
| `APP_DIR` | Application directory path | `/home/ubuntu/app` |

#### Database Configuration

| Secret Name | Description |
|-------------|-------------|
| `DB_EC2_HOST` | Private IP of database server |
| `DB_EC2_SSH_KEY` | Database server SSH key |
| `DB_EC2_USER` | Database server username |
| `DB_NAME` | Production database name |
| `DB_USER_NAME` | Database authentication username |
| `DB_PASSWORD` | Database authentication password |

#### Service Configuration

| Secret Name | Description |
|-------------|-------------|
| `SERVICE_NAME` | Systemd service identifier |
| `DOMAIN_NAME` | Production domain for SSL certificate |
| `PORT` | Application port (typically 3000) |
| `NODE_ENV` | Environment setting (production) |

#### Application Services

| Secret Name | Description |
|-------------|-------------|
| `EMAIL_SERVER_HOST` | SMTP server configuration |
| `EMAIL_SERVER_USER` | SMTP authentication credentials |
| `NEXTAUTH_SECRET` | NextAuth.js encryption key |
| `API_KEY` | External service integration |

#### SMS Configuration

| Secret Name | Description |
|-------------|-------------|
| `SMS_USER` | SMS API username |
| `SMS_PASSWORD` | SMS API password |
| `SMS_FROM` | SMS sender code (5-digit) |
| `SMS_URL` | SMS provider endpoint URL |
| `SMS_DATA_CODING` | SMS data coding (default: 0) |
| `SMS_TEST_MODE` | Test mode flag (true/false) |

### 2.2 Secret Value Updates

Update these critical secrets with your AWS infrastructure values:

```bash
EC2_HOST=[Public IP from application EC2 instance]
DB_EC2_HOST=[Private IP from database EC2 instance]
EC2_SSH_KEY=[Complete contents of your .pem private key]
DOMAIN_NAME=[your-production-domain.com]
```

> ⚠️ **Important**: Ensure SSH keys are properly formatted with correct line breaks. Domain names must have valid DNS A records pointing to your server's public IP before SSL certificate issuance.

---

## 3. CI/CD Pipeline

### 3.1 Deployment Triggers

The GitHub Actions workflow supports two deployment methods:

#### Automatic Deployment
```yaml
on:
  push:
    branches: [main]
  pull_request:
    types: [closed]
    branches: [main]
```

#### Manual Deployment
```yaml
on:
  workflow_dispatch: {}
```

### 3.2 Pipeline Execution Flow

#### 1. Pre-Deployment Analysis
- Deployment status validation (checks for existing DEPLOYED marker)
- Environment classification (initial deployment vs. update)
- Database provisioning requirements assessment
- Dependency resolution and conflict detection

#### 2. Database Infrastructure (Initial Deployment)
- Secure SSH tunnel establishment to database server
- Database connectivity validation and health checks
- Schema migration execution (`migrate:deploy`)
- Database schema generation (`db:generate`)
- Initial data seeding (`db:seed` - first deployment only)

#### 3. System Provisioning (Initial Deployment)
```bash
# System package updates and security patches
sudo apt update && sudo apt upgrade -y

# Node.js 18 LTS installation (production-ready runtime)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Web server and essential utilities
sudo apt install nginx git mysql-client certbot python3-certbot-nginx -y

# Service management configuration
sudo systemctl enable nginx
```

#### 4. Application Deployment
- Repository synchronization (clone/pull from main branch)
- Dependency installation with `npm ci` (production dependencies)
- Database operation execution and verification
- Application build process (Next.js optimization)
- Systemd service configuration and registration
- Nginx reverse proxy configuration
- Service orchestration (start/restart operations)

#### 5. SSL Certificate Automation (Initial Deployment)

> 🔐 **Automated SSL Certificate Management**: The deployment pipeline automatically provisions SSL certificates using Let's Encrypt via Certbot when `DOMAIN_NAME` is configured.

```bash
# Automated certificate provisioning process
sudo certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email ${EMAIL_FROM} \
  --domains ${DOMAIN_NAME} \
  --redirect

# Auto-renewal configuration
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Renewal testing
sudo certbot renew --dry-run
```

#### 6. Deployment Verification
- Service health checks (systemctl status validation)
- Application connectivity testing (HTTP/HTTPS endpoints)
- Database connection verification
- SSL certificate validation and expiration monitoring
- Deployment artifact creation and versioning

---

## 4. Deployment Execution

### 4.1 Manual Deployment Procedure

1. Navigate to GitHub repository → **Actions** tab
2. Select **"Main Deployment Pipeline"** workflow
3. Click **"Run workflow"** (requires appropriate permissions)
4. Branch selection: `main` (production branch)
5. Confirm workflow execution
6. Monitor deployment progress through real-time logs

> 📊 **Deployment Monitoring**: Monitor deployment progress, error messages, and system status confirmations through the GitHub Actions interface. Each step provides detailed logging for troubleshooting.


#### SSL Certificate Verification
```bash
# Certificate expiration check
sudo certbot certificates

# Certificate renewal test
sudo certbot renew --dry-run

# SSL configuration validation
sudo nginx -t
sudo ssl-cert-check -c /etc/letsencrypt/live/[DOMAIN]/cert.pem
```

### 4.3 Performance Validation
```bash
# Application performance metrics
curl -w "@curl-format.txt" -s -o /dev/null https://[DOMAIN_NAME]

# Server resource utilization
htop
df -h
free -m
```

## 5. Operations & Troubleshooting

### 5.1 Common Production Issues

#### SSH Authentication Failures

**Symptoms**: GitHub Actions deployment fails with "Permission denied (publickey)" or connection timeout errors.

**Resolution Steps**:
- Verify `EC2_SSH_KEY` secret contains complete private key with proper formatting
- Confirm security group allows SSH (port 22) from GitHub Actions IP ranges
- Validate `EC2_HOST` contains current public IP address
- Check EC2 instance status and ensure it's running

#### Database Connectivity Issues

**Symptoms**: Application fails to connect to database, migration errors, or timeout exceptions.

**Resolution Steps**:
- Verify database EC2 instance is running and accessible
- Confirm security group allows MySQL (port 3306) from application subnet
- Validate database credentials in GitHub secrets
- Test network connectivity between application and database servers
- Check MySQL service status on database server

#### Application Accessibility Problems

**Symptoms**: Site unreachable via HTTP/HTTPS, nginx errors, or service failures.

**Resolution Steps**:
- Verify Nginx service status and configuration validity
- Confirm security group allows HTTP (80) and HTTPS (443) traffic
- Check application service status and logs
- Validate port binding and process conflicts
- Review Nginx error logs for specific issues

### 5.2 SSL Certificate Management

> 🎯 **Automatic vs Manual SSL Management**: The deployment pipeline automatically provisions SSL certificates during initial deployment. Manual intervention is only required when automatic provisioning fails.

#### Manual SSL Certificate Installation

**When Required**: If the site is not accessible via HTTPS after deployment, or if automatic certificate provisioning failed during the initial deployment process.

#### SSH Access and Manual Certbot Execution
```bash
# Establish SSH connection to production server
ssh -i /path/to/your-private-key.pem ubuntu@[PUBLIC_IP]

# Execute Certbot with interactive domain selection
sudo certbot --nginx

# Follow interactive prompts:
# - Select domain number from presented list
# - Choose redirect option (recommended: 2)
# - Verify certificate installation success
```

#### SSL Prerequisites Verification
- DNS A record correctly points domain to server public IP
- Domain propagation completed (use `dig` or `nslookup` for verification)
- Nginx configuration includes proper `server_name` directive
- Security groups allow inbound traffic on ports 80 and 443
- No firewall blocking Let's Encrypt validation requests

#### SSL Troubleshooting Commands
```bash
# DNS resolution verification
dig [DOMAIN_NAME] A
nslookup [DOMAIN_NAME]

# Certificate status check
sudo certbot certificates

# Nginx configuration test
sudo nginx -t

# Manual certificate renewal test
sudo certbot renew --dry-run

# Certificate expiration monitoring
sudo certbot certificates | grep "Expiry Date"
```

*Last Updated: [Current Date] • Document Version: 2.1*