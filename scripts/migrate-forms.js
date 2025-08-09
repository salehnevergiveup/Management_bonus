const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateForms() {
  try {
    console.log('Starting form migration...');

    // Get all process progress records with form events
    const forms = await prisma.processProgress.findMany({
      where: {
        event_name: {
          in: ['verification_options', 'verification_code', 'confirmation_dialog']
        }
      }
    });

    console.log(`Found ${forms.length} forms to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const form of forms) {
      try {
        if (!form.data) {
          console.log(`Skipping form ${form.id} - no data`);
          skippedCount++;
          continue;
        }

        const data = { ...form.data };
        let needsUpdate = false;

        // If is_active is not set, set it based on timeout
        if (data.is_active === undefined) {
          if (data.timeout && data.timeout > 0) {
            // Check if form has expired based on creation time and timeout
            const createdAt = form.created_at instanceof Date
              ? form.created_at
              : new Date(form.created_at);
            
            const expiredDate = createdAt.getTime() + (data.timeout * 1000);
            const currentTime = new Date().getTime();
            const remainTime = (expiredDate - currentTime) / 1000;
            
            data.is_active = remainTime > 0;
          } else {
            // No timeout or timeout is 0, set as active (unlimited form)
            data.is_active = true;
          }
          needsUpdate = true;
        }

        if (needsUpdate) {
          await prisma.processProgress.update({
            where: { id: form.id },
            data: { data }
          });
          updatedCount++;
          console.log(`Updated form ${form.id} - is_active: ${data.is_active}`);
        } else {
          skippedCount++;
          console.log(`Skipped form ${form.id} - already has is_active`);
        }

      } catch (error) {
        console.error(`Error migrating form ${form.id}:`, error);
        skippedCount++;
      }
    }

    console.log(`Migration completed!`);
    console.log(`Updated: ${updatedCount} forms`);
    console.log(`Skipped: ${skippedCount} forms`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateForms();
}

module.exports = { migrateForms }; 