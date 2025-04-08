import { prisma } from "@/lib/prisma";

export const SeedBonuses = async () => {
  console.log('Starting Bonus seeding...');
  
  try {
    // Define the bonus data
    const bonusFunction = `function calculateTurnoverBonus(turnoverData, exchangeRates, baselineData) {
  const bonuses = [];
  const { games, turnoverThresholds, defaultCurrency } = baselineData;
  
  // Process each user's data
  Object.keys(turnoverData).forEach(username => {
    const userData = turnoverData[username];
    
    // Process each game
    userData.games.forEach(gameData => {
      const { game, turnover, currency } = gameData;
      
      // Skip games not in our categories
      if (!games[game]) {
        console.log(\`Game not found in categories: \${game}\`);
        return;
      }
      
      // Get game category (high or low)
      const category = games[game];
      
      // Get the appropriate thresholds based on game category
      const categoryThresholds = turnoverThresholds[category];
      
      // Find the correct payout threshold
      let payout = 0;
      for (let i = categoryThresholds.length - 1; i >= 0; i--) {
        if (turnover >= categoryThresholds[i].turnover) {
          payout = categoryThresholds[i].payout;
          break;
        }
      }
      
      // If turnover didn't meet minimum threshold, no bonus
      if (payout === 0) {
        console.log(\`No bonus for \${username} - \${game}: turnover \${turnover} didn't meet minimum threshold\`);
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
        console.log(\`Converted payout for \${username}: \${payout} \${defaultCurrency} -> \${convertedPayout} \${currency}\`);
      }
      
      // Add bonus to results
      bonuses.push({
        username,
        amount: convertedPayout,
        currency
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
Higher turnover amounts lead to larger bonus payouts, with tiered reward levels.
The system automatically handles currency conversion if a player's currency differs from the default (MYR).
Players with turnover below the minimum threshold (500) receive no bonus.`;

    // Create the bonus
    const bonus = await prisma.bonus.create({
      data: {
        name: "Low and High Turnover Bonus",
        description: bonusDescription,
        function: bonusFunction,
        baseline: bonusBaseline,
        // Not setting updated_at as requested
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