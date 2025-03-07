import { PrismaClient } from "@prisma/client";
import { NotificationStatus, NotificationType } from "@/constants/notifications";

const prisma = new PrismaClient();

export const SeedNotifications = async () => {
  console.log("Seeding notifications...");

  // Get admin user
  const adminUser = await prisma.user.findUnique({
    where: { username: "admin123" },
  });

  if (!adminUser) {
    console.error("Admin user not found! Run the user seeder first.");
    return;
  }

  // Get first two non-admin users
  const regularUsers = await prisma.user.findMany({
    where: { username: { not: "admin123" } },
    take: 2,
  });

  if (regularUsers.length < 2) {
    console.error("Regular users not found! Make sure to run the management users seeder first.");
    return;
  }

  // Generate notification messages
  const notificationMessages = [
    "Your account has been verified successfully.",
    "Welcome to our platform! Here's how to get started.",
    "Your password was changed successfully.",
    "Security alert: New login from an unknown device.",
    "Your subscription will expire in 7 days.",
    "A new feature has been added to the platform.",
    "You have a new message from the support team.",
    "Your recent transaction has been processed.",
    "System maintenance scheduled for tomorrow.",
    "Your profile has been updated successfully.",
    "Your document has been approved.",
    "Action required: Please update your payment information.",
    "Your request has been received and is being processed.",
    "Invoice #12345 has been generated.",
    "Reminder: Meeting scheduled for tomorrow at 2 PM.",
    "Your task has been assigned to another team member.",
    "You have been added to a new project.",
    "Your account settings have been updated.",
    "New login attempt detected.",
    "Important security update available.",
  ];

  // Create 30 notifications for admin user
  const adminNotifications = [];
  for (let i = 0; i < 30; i++) {
    const messageIndex = i % notificationMessages.length;
    const typeValues = Object.values(NotificationType);
    const randomType = typeValues[Math.floor(Math.random() * typeValues.length)];
    
    // Make 80% unread, 20% read
    const status = Math.random() > 0.8 
      ? NotificationStatus.READ 
      : NotificationStatus.UNREAD;
    
    // Create notification with a date in the past (up to 30 days)
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    adminNotifications.push({
      user_id: adminUser.id,
      message: notificationMessages[messageIndex],
      type: randomType,
      status,
      createdAt,
    });
  }
  
  // Create notifications for regular users (30 each, 60 total)
  const regularUserNotifications = [];
  for (const user of regularUsers) {
    for (let i = 0; i < 30; i++) {
      const messageIndex = i % notificationMessages.length;
      const typeValues = Object.values(NotificationType);
      const randomType = typeValues[Math.floor(Math.random() * typeValues.length)];
      
      // Make 70% unread, 30% read for more testing opportunities
      const status = Math.random() > 0.7 
        ? NotificationStatus.READ 
        : NotificationStatus.UNREAD;
      
      // Create notification with a date in the past (up to 30 days)
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      
      regularUserNotifications.push({
        user_id: user.id,
        message: notificationMessages[messageIndex],
        type: randomType,
        status,
        createdAt,
      });
    }
  }

  // Combine all notifications and create them in the database
  const allNotifications = [...adminNotifications, ...regularUserNotifications];
  
  // Use createMany for efficiency
  await prisma.notification.createMany({
    data: allNotifications,
    skipDuplicates: true, // Skip if duplicates exist (based on unique fields)
  });

  console.log(`Successfully seeded ${allNotifications.length} notifications.`);
};