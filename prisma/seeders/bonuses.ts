import { prisma } from "@/lib/prisma";

export const SeedBonuses = async () => {
  console.log('Starting Bonus seeding...');
  
  try {
    // Define the bonus data
    const bonusFunction = `function calculateTurnoverBonus(turnoverData, exchangeRates, baselineData) {
      // Parse baselineData if it's a string
      if (typeof baselineData === 'string') {
        baselineData = JSON.parse(baselineData);
      }
      
      // Verify that required properties exist in baselineData
      if (!baselineData.games || !baselineData.multipliers || !baselineData.turnoverThresholds || !baselineData.defaultCurrency) {
        return [];
      }
      
      const bonuses = [];
      const { games, multipliers, turnoverThresholds, defaultCurrency } = baselineData;
      
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
          
          // Skip games not in our categories
          if (!games[game]) {
            return;
          }
          
          // Get multiplier for this game, default to 1 if not specified
          const multiplier = multipliers[game] || 1;
          
          // Calculate final turnover: multiplier × current turnover
          const finalTurnover = turnover * multiplier;
          
          const category = games[game];
          
          // Get the appropriate thresholds based on game category
          const categoryThresholds = turnoverThresholds[category];
          if (!categoryThresholds || !Array.isArray(categoryThresholds)) {
            return;
          }
          
          // Find the correct payout threshold using finalTurnover
          let payout = 0;
          
          for (let i = categoryThresholds.length - 1; i >= 0; i--) {
            if (finalTurnover >= categoryThresholds[i].turnover) {
              payout = categoryThresholds[i].payout;
              break;
            }
          }
          
          // If final turnover didn't meet minimum threshold, no bonus
          if (payout === 0) {
            return;
          }
          
          // Convert payout to user's currency if different from base currency
          let convertedPayout = payout;
          
          if (currency !== defaultCurrency) {
            // First check direct conversion rate
            if (exchangeRates[defaultCurrency] && exchangeRates[defaultCurrency][currency]) {
              convertedPayout = payout * exchangeRates[defaultCurrency][currency];
            } 
            // If no direct conversion, try reverse
            else if (exchangeRates[currency] && exchangeRates[currency][defaultCurrency]) {
              convertedPayout = payout / exchangeRates[currency][defaultCurrency];
            }
          }
          
          // Add bonus to results with the ID and game fields included
          bonuses.push({
            username,
            amount: convertedPayout,
            currency,
            game,            
            turnover_id: id,  
            createdAt       
          });
        });
      });
      
      return bonuses;
    }`;

    const bonusBaseline = {
      "games": {
        "EKOR": "high",
        "LUCKY365": "high",
        "LION KING": "high",
        "MONKEYKING": "high",
        "JDB SLOT": "high",
        "PLAY8": "high",
        "KINGMIDAS": "high",
        "MAX BET": "high",
        "MICROSLOT": "high",
        "RCB988": "high",
        "CMD": "high",
        "BTI": "high",
        "9WICKETS": "high",
        "MEGA88": "high",
        "YGR": "high",
        "ASKME SLOT": "high",
        "918KISS": "low",
        "POKER WIN": "low",
        "ACE WIN": "low",
        "PRAGMATIC": "low",
        "SPADE": "low",
        "JILI": "low",
        "BG": "low",
        "AG": "low",
        "PT LIVE": "low",
        "PT SLOT": "low",
        "SV388": "low",
        "EVOLUTION": "low",
        "HOTROAD": "low",
        "SEXY": "low",
        "DB CASINO": "low",
        "EZUGI": "low"
      },
      "multipliers": {
        "EKOR": 1,
        "LUCKY365": 1,
        "LION KING": 1,
        "MONKEYKING": 1,
        "JDB SLOT": 1,
        "PLAY8": 1,
        "KINGMIDAS": 1,
        "MAX BET": 1,
        "MICROSLOT": 1,
        "RCB988": 1,
        "CMD": 1,
        "BTI": 1,
        "9WICKETS": 1,
        "MEGA88": 1,
        "YGR": 1,
        "ASKME SLOT": 1,
        "918KISS": 1,
        "POKER WIN": 1,
        "ACE WIN": 1,
        "PRAGMATIC": 1,
        "SPADE": 1,
        "JILI": 1,
        "BG": 1,
        "AG": 1,
        "PT LIVE": 1,
        "PT SLOT": 1,
        "SV388": 1,
        "EVOLUTION": 1,
        "HOTROAD": 1,
        "SEXY": 1,
        "DB CASINO": 1,
        "EZUGI": 1
      },
      "turnoverThresholds": {
        "high": [
          { "turnover": 500, "payout": 8 },
          { "turnover": 1000, "payout": 15 },
          { "turnover": 3000, "payout": 30 },
          { "turnover": 10000, "payout": 100 },
          { "turnover": 50000, "payout": 550 },
          { "turnover": 100000, "payout": 1200 },
          { "turnover": 500000, "payout": 5000 },
          { "turnover": 1000000, "payout": 12000 },
          { "turnover": 5000000, "payout": 58888 }
        ],
        "low": [
          { "turnover": 500, "payout": 3 },
          { "turnover": 1000, "payout": 6 },
          { "turnover": 3000, "payout": 20 },
          { "turnover": 10000, "payout": 40 },
          { "turnover": 50000, "payout": 300 },
          { "turnover": 100000, "payout": 600 },
          { "turnover": 500000, "payout": 2350 },
          { "turnover": 1000000, "payout": 4800 },
          { "turnover": 5000000, "payout": 25000 }
        ]
      },
      "defaultCurrency": "MYR"
    };

    const bonusDescription = `This bonus system calculates player rewards based on their turnover in different games. 
Games are categorized as either 'high' or 'low', with different payout thresholds for each category.
The system applies multipliers to player turnover before determining bonus payouts.
Final turnover = multiplier × current turnover
Higher final turnover amounts lead to larger bonus payouts, with tiered reward levels.
The system automatically handles currency conversion if a player's currency differs from the default (MYR).
Players with final turnover below the minimum threshold (500) receive no bonus.`;

    // Create the bonus
    const bonus = await prisma.bonus.create({
      data: {
        name: "Low and High Turnover Bonus",
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