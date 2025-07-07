import { prisma } from "@/lib/prisma";

export const SeedExchangeRate = async () => {
  console.log('Starting Exchange Rate seeding...');
  
  try {
    // Create MYR to USD exchange rate
    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        fromCurrency: 'MYR',
        toCurrency: 'USD',
        rate: 4.2
      }
    });

    console.log(`✅ Exchange Rate seeding completed! Created rate: ${exchangeRate.fromCurrency} to ${exchangeRate.toCurrency} = ${exchangeRate.rate}`);
    
    return exchangeRate;

  } catch (error) {
    console.error('❌ Error during Exchange Rate seeding:', error);
    throw error;
  }
};

export default SeedExchangeRate;