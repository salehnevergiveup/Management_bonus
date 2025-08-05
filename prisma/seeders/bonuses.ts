import { prisma } from "@/lib/prisma";

export const SeedBonuses = async () => {
  console.log('Starting Bonus seeding...');
  
  try {
    // Define the bonus function with simplified multiplier logic
    const bonusFunction = `function calculateTurnoverBonus(turnoverData, exchangeRates, baselineData) {
      // Parse baselineData if it's a string
      if (typeof baselineData === 'string') {
        baselineData = JSON.parse(baselineData);
      }
      
      // Verify that required properties exist in baselineData
      if (!baselineData.games || !baselineData.defaultCurrency) {
        return [];
      }
      
      const bonuses = [];
      const { games, defaultCurrency } = baselineData;
      
      Object.keys(turnoverData).forEach(username => {
        const userData = turnoverData[username];
        
        if (!userData.games || !Array.isArray(userData.games)) {
          return;
        }
        
        userData.games.forEach(gameData => {
          const { id, game, turnover, currency, createdAt } = gameData;
          
          if (!id || !game || turnover === undefined || !currency) {
            return;
          }
          
          // Get multiplier for this game, or use default (1) if not specified
          const multiplier = games[game] || 1;
          
          // Calculate bonus: turnover * multiplier
          let bonusAmount = turnover * multiplier;
          
          // Convert bonus to user's currency if different from base currency
          let convertedBonus = bonusAmount;
          
          if (currency !== defaultCurrency) {
            // First check direct conversion rate
            if (exchangeRates[defaultCurrency] && exchangeRates[defaultCurrency][currency]) {
              convertedBonus = bonusAmount * exchangeRates[defaultCurrency][currency];
            } 
            // If no direct conversion, try reverse
            else if (exchangeRates[currency] && exchangeRates[currency][defaultCurrency]) {
              convertedBonus = bonusAmount / exchangeRates[currency][defaultCurrency];
            }
          }
          
          // Add bonus to results
          bonuses.push({
            username,
            amount: convertedBonus,
            currency,
            game,            
            turnover_id: id,  
            createdAt       
          });
        });
      });
      
      return bonuses;
    }`;

    // Simplified baseline with empty games object
    const bonusBaseline = {
      "games": {
        // Empty - all games will use default multiplier of 1
      },
      "defaultCurrency": "MYR"
    };

    const bonusDescription = `This simplified bonus system calculates player rewards using multipliers based on their turnover in different games. 
Each game has a specific multiplier (e.g., 0.02 for high-tier games, 0.01 for low-tier games).
Games not listed in the baseline use the default multiplier of 1 (hardcoded).
Bonus = Turnover × Game Multiplier
The system automatically handles currency conversion if a player's currency differs from the default (MYR).`;

    // Create the bonus
    const bonus = await prisma.bonus.create({
      data: {
        name: "Multiplier-Based Turnover Bonus",
        description: bonusDescription,
        function: bonusFunction.toString(),
        baseline: bonusBaseline,
      }
    });

    console.log(`Bonus seeding completed successfully! Created bonus: ${bonus.name}`);
    return [bonus];
  } catch (error) {
    console.error('Error during Bonus seeding:', error);
    throw error;
  }
};

export default SeedBonuses;