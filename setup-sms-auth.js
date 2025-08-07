const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function setupSmsAuth() {
  try {
    console.log('🔧 Setting up SMS authentication...');

    // 1. Add sms-send permission
    console.log('📝 Adding sms-send permission...');
    const smsPermission = await prisma.permission.upsert({
      where: { name: 'sms-send' },
      update: {},
      create: { name: 'sms-send' },
    });
    console.log('✅ sms-send permission created/updated');

    // 2. Create loyalty app API key
    console.log('🔑 Creating loyalty app API key...');
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 90); // 90 days

    const loyaltyAppKey = await prisma.aPIKey.upsert({
      where: { application: 'loyalty app' },
      update: {
        token: token,
        expires_at: expires_at,
        is_revoked: false
      },
      create: {
        application: 'loyalty app',
        token: token,
        expires_at: expires_at,
        is_revoked: false
      },
    });
    console.log('✅ loyalty app API key created/updated');

    // 3. Assign sms-send permission to loyalty app
    console.log('🔗 Assigning sms-send permission to loyalty app...');
    await prisma.aPIKeyPermission.upsert({
      where: {
        apikey_id_permission_id: {
          apikey_id: loyaltyAppKey.id,
          permission_id: smsPermission.id
        }
      },
      update: {},
      create: {
        apikey_id: loyaltyAppKey.id,
        permission_id: smsPermission.id
      },
    });
    console.log('✅ sms-send permission assigned to loyalty app');

    console.log('\n🎉 SMS authentication setup complete!');
    console.log('\n📋 API Key Details:');
    console.log(`Application: ${loyaltyAppKey.application}`);
    console.log(`Token: ${loyaltyAppKey.token}`);
    console.log(`Expires: ${loyaltyAppKey.expires_at}`);
    console.log(`Permission: ${smsPermission.name}`);

    console.log('\n📱 Test Headers:');
    console.log(`X-API-Key: ${loyaltyAppKey.token}`);
    console.log('\n📋 Test Request:');
    console.log(`curl -X POST http://your-domain.com/api/external-app/sms/rewardreach \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "X-API-Key: ${loyaltyAppKey.token}" \\`);
    console.log(`  -d '[{"phone_number": "60123456789", "UID": "123456"}]'`);

  } catch (error) {
    console.error('❌ Error setting up SMS authentication:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupSmsAuth(); 