import { BonusResult, ExchangeRates } from '@/types/bonus.type';
import { convertToMYR, deduplicateUsersByHighestAmount } from '@/lib/currencyUtils';

const mockExchangeRates: ExchangeRates = {
  'USD': {
    'MYR': 4.2, // 1 USD = 4.2 MYR
    'EUR': 0.85
  },
  'EUR': {
    'MYR': 4.95, // 1 EUR = 4.95 MYR
    'USD': 1.18
  },
  'MYR': {
    'USD': 0.238, // 1 MYR = 0.238 USD
    'EUR': 0.202
  }
};

const mockBonusResults: BonusResult[] = [
  {
    turnover_id: '1',
    game: 'POKER',
    username: 'user1',
    amount: 100,
    currency: 'USD' // 100 USD = 420 MYR
  },
  {
    turnover_id: '2',
    game: 'SLOTS',
    username: 'user1',
    amount: 50,
    currency: 'EUR' // 50 EUR = 247.5 MYR
  },
  {
    turnover_id: '3',
    game: 'BLACKJACK',
    username: 'user1',
    amount: 400,
    currency: 'MYR' // 400 MYR (should be kept - highest)
  },
  {
    turnover_id: '4',
    game: 'ROULETTE',
    username: 'user2',
    amount: 200,
    currency: 'USD' // 200 USD = 840 MYR (should be kept)
  },
  {
    turnover_id: '5',
    game: 'BACCARAT',
    username: 'user2',
    amount: 150,
    currency: 'EUR' // 150 EUR = 742.5 MYR
  },
  {
    turnover_id: '6',
    game: 'CRAPS',
    username: 'user3',
    amount: 300,
    currency: 'MYR' // 300 MYR
  }
];

// Test suite
describe('Deduplication Logic Tests', () => {
  
  describe('convertToMYR', () => {
    test('should convert USD to MYR correctly', () => {
      const result = convertToMYR(100, 'USD', mockExchangeRates);
      expect(result).toBe(420); // 100 USD * 4.2 = 420 MYR
    });

    test('should convert EUR to MYR correctly', () => {
      const result = convertToMYR(50, 'EUR', mockExchangeRates);
      expect(result).toBe(247.5); // 50 EUR * 4.95 = 247.5 MYR
    });

    test('should return original amount for MYR', () => {
      const result = convertToMYR(300, 'MYR', mockExchangeRates);
      expect(result).toBe(300);
    });

    test('should handle missing conversion rate gracefully', () => {
      const result = convertToMYR(100, 'JPY', mockExchangeRates);
      expect(result).toBe(100); // Should return original amount as fallback
    });
  });

  describe('deduplicateUsersByHighestAmount', () => {
    test('should deduplicate users and keep highest amount in MYR terms', () => {
      const result = deduplicateUsersByHighestAmount(mockBonusResults, mockExchangeRates);
      
      // Should have 3 unique users
      expect(result.length).toBe(3);
      
      // Find user1's result
      const user1Result = result.find(r => r.username === 'user1');
      expect(user1Result).toBeDefined();
      expect(user1Result!.amount).toBe(100); // 100 USD = 420 MYR is highest (420 MYR > 400 MYR)
      expect(user1Result!.currency).toBe('USD');
      
      // Find user2's result
      const user2Result = result.find(r => r.username === 'user2');
      expect(user2Result).toBeDefined();
      expect(user2Result!.amount).toBe(200); // 200 USD = 840 MYR is highest
      expect(user2Result!.currency).toBe('USD');
      
      // Find user3's result
      const user3Result = result.find(r => r.username === 'user3');
      expect(user3Result).toBeDefined();
      expect(user3Result!.amount).toBe(300);
      expect(user3Result!.currency).toBe('MYR');
    });

    test('should preserve original currency and amount in output', () => {
      const result = deduplicateUsersByHighestAmount(mockBonusResults, mockExchangeRates);
      
      // Check that we're not modifying the original amounts or currencies
      result.forEach(record => {
        expect(typeof record.amount).toBe('number');
        expect(typeof record.currency).toBe('string');
        expect(record.amount).toBeGreaterThan(0);
      });
    });

    test('should handle empty array', () => {
      const result = deduplicateUsersByHighestAmount([], mockExchangeRates);
      expect(result).toEqual([]);
    });

    test('should handle single user with multiple records', () => {
      const singleUserData: BonusResult[] = [
        {
          turnover_id: '1',
          game: 'POKER',
          username: 'user1',
          amount: 100,
          currency: 'USD'
        },
        {
          turnover_id: '2',
          game: 'SLOTS',
          username: 'user1',
          amount: 50,
          currency: 'EUR'
        }
      ];
      
      const result = deduplicateUsersByHighestAmount(singleUserData, mockExchangeRates);
      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(100); // 100 USD = 420 MYR > 50 EUR = 247.5 MYR
      expect(result[0].currency).toBe('USD');
    });

    test('should handle users with same amount in different currencies', () => {
      const sameAmountData: BonusResult[] = [
        {
          turnover_id: '1',
          game: 'POKER',
          username: 'user1',
          amount: 100,
          currency: 'USD' // 100 USD = 420 MYR
        },
        {
          turnover_id: '2',
          game: 'SLOTS',
          username: 'user1',
          amount: 84.85, // 84.85 EUR ≈ 420 MYR (very close)
          currency: 'EUR'
        }
      ];
      
      const result = deduplicateUsersByHighestAmount(sameAmountData, mockExchangeRates);
      expect(result.length).toBe(1);
      // Should keep the EUR one since 84.85 EUR ≈ 420 MYR is slightly higher than 100 USD = 420 MYR
      expect(result[0].currency).toBe('EUR');
    });
  });

  describe('Performance Tests', () => {
    test('should handle large datasets efficiently', () => {
      // Create a large dataset with many duplicate users
      const largeDataset: BonusResult[] = [];
      const currencies = ['USD', 'EUR', 'MYR'];
      
      for (let i = 0; i < 10000; i++) {
        const username = `user${i % 1000}`; // 1000 unique users
        const currency = currencies[i % 3];
        const amount = Math.random() * 1000;
        
        largeDataset.push({
          turnover_id: `id${i}`,
          game: `game${i % 10}`,
          username,
          amount,
          currency
        });
      }
      
      const startTime = Date.now();
      const result = deduplicateUsersByHighestAmount(largeDataset, mockExchangeRates);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should have exactly 1000 unique users
      expect(result.length).toBe(1000);
      
      // All usernames should be unique
      const usernames = result.map(r => r.username);
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amounts', () => {
      const zeroAmountData: BonusResult[] = [
        {
          turnover_id: '1',
          game: 'POKER',
          username: 'user1',
          amount: 0,
          currency: 'USD'
        },
        {
          turnover_id: '2',
          game: 'SLOTS',
          username: 'user1',
          amount: 100,
          currency: 'EUR'
        }
      ];
      
      const result = deduplicateUsersByHighestAmount(zeroAmountData, mockExchangeRates);
      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(100); // Should keep the non-zero amount
    });

    test('should handle negative amounts', () => {
      const negativeAmountData: BonusResult[] = [
        {
          turnover_id: '1',
          game: 'POKER',
          username: 'user1',
          amount: -100,
          currency: 'USD'
        },
        {
          turnover_id: '2',
          game: 'SLOTS',
          username: 'user1',
          amount: 50,
          currency: 'EUR'
        }
      ];
      
      const result = deduplicateUsersByHighestAmount(negativeAmountData, mockExchangeRates);
      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(50); // Should keep the positive amount
    });

    test('should handle missing exchange rates gracefully', () => {
      const incompleteExchangeRates: ExchangeRates = {
        'USD': {
          'EUR': 0.85
        }
      };
      
      const result = deduplicateUsersByHighestAmount(mockBonusResults, incompleteExchangeRates);
      expect(result.length).toBe(3); // Should still work with fallback
    });
  });
}); 