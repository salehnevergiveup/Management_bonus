export interface Bonus {
    id?: string;
    name: string;
    function: string; 
    description: string;
    baseline: any; 
    created_at?: string;
    updated_at?: string;
  }
  
export interface GameData {
  game: string;
  currency: string;
  turnover: number;
  createdAt: string;
}

export interface UserData {
  username: string;
  games: GameData[];
}

export interface TurnoverData {
  [username: string]: UserData;
}

export interface ExchangeRates {
  [fromCurrency: string]: {
    [toCurrency: string]: number;
  };
}

export interface BonusResult {
  username: string;
  amount: number;
  currency: string;
}