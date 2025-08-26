import { BonusResult, ExchangeRates } from '@/types/bonus.type';

/**
 * Converts an amount from one currency to MYR for fair comparison
 * @param amount - The amount to convert
 * @param fromCurrency - The source currency
 * @param exchangeRates - The exchange rates object
 * @returns The amount converted to MYR
 */
export const convertToMYR = (amount: number, fromCurrency: string, exchangeRates: ExchangeRates): number => {
  if (fromCurrency === 'MYR') {
    return amount;
  }
  
  // Try direct conversion
  if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency]['MYR']) {
    return amount * exchangeRates[fromCurrency]['MYR'];
  }
  
  // Try reverse conversion
  if (exchangeRates['MYR'] && exchangeRates['MYR'][fromCurrency]) {
    return amount / exchangeRates['MYR'][fromCurrency];
  }
  
  // If no conversion rate found, return original amount (fallback)
  return amount;
};

/**
 * Deduplicates users by keeping only the record with the highest amount (converted to MYR for fair comparison)
 * @param results - Array of bonus results that may contain duplicate users
 * @param exchangeRates - The exchange rates object for currency conversion
 * @returns Array of deduplicated results with one record per user
 */
export const deduplicateUsersByHighestAmount = (results: BonusResult[], exchangeRates: ExchangeRates): BonusResult[] => {
  const userMap = new Map<string, BonusResult>();
  
  for (const result of results) {
    const existingResult = userMap.get(result.username);
    
    if (!existingResult) {
      // First occurrence of this user, add to map
      userMap.set(result.username, result);
      continue;
    }
    
    // Convert both amounts to MYR for fair comparison
    const existingAmountMYR = convertToMYR(existingResult.amount, existingResult.currency, exchangeRates);
    const currentAmountMYR = convertToMYR(result.amount, result.currency, exchangeRates);
    
    // Keep the record with the higher amount (in MYR terms)
    if (currentAmountMYR > existingAmountMYR) {
      userMap.set(result.username, result);
    }
  }
  
  return Array.from(userMap.values());
}; 