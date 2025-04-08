// src/data/test-data.js

/**
 * Turnover data grouped by username
 * Each user has an array of game activities with potentially different currencies
 */
export const turnoverData = {
    "WAZIR7505": {
      username: "WAZIR7505",
      games: [
        { game: "LUCKY365", currency: "MYR", turnover: 1311.50, createdAt: "2025-04-06 18:15:18.256" },
        { game: "LION KING", currency: "MYR", turnover: 2546.10, createdAt: "2025-04-06 18:15:18.259" },
        { game: "MEGA888", currency: "USD", turnover: 250.75, createdAt: "2025-04-06 19:22:14.112" }
      ]
    },
    "RYKARL69": {
      username: "RYKARL69",
      games: [
        { game: "PLAY8", currency: "MYR", turnover: 17.66, createdAt: "2025-04-06 18:15:18.257" },
        { game: "LION KING", currency: "MYR", turnover: 26.80, createdAt: "2025-04-06 18:15:18.256" },
        { game: "LUCKY365", currency: "EUR", turnover: 35.20, createdAt: "2025-04-06 20:15:22.111" }
      ]
    },
    "JAPANSTYLE11": {
      username: "JAPANSTYLE11",
      games: [
        { game: "LUCKY365", currency: "MYR", turnover: 435.60, createdAt: "2025-04-06 18:15:18.257" },
        { game: "918KISS", currency: "JPY", turnover: 15000.00, createdAt: "2025-04-06 16:44:12.789" }
      ]
    },
    "LANTODAK1194": {
      username: "LANTODAK1194",
      games: [
        { game: "EKOR", currency: "MYR", turnover: 187.00, createdAt: "2025-04-06 18:15:18.259" }
      ]
    },
    "MOLEK3KALI": {
      username: "MOLEK3KALI",
      games: [
        { game: "LUCKY365", currency: "MYR", turnover: 4811.05, createdAt: "2025-04-06 18:15:18.259" },
        { game: "JOKER", currency: "USD", turnover: 350.45, createdAt: "2025-04-06 17:22:45.123" }
      ]
    },
    "NASHAFIZI90": {
      username: "NASHAFIZI90",
      games: [
        { game: "MEGA88", currency: "MYR", turnover: 487.41, createdAt: "2025-04-06 18:15:18.258" }
      ]
    },
    "ESIKUIL65": {
      username: "ESIKUIL65",
      games: [
        { game: "LUCKY365", currency: "MYR", turnover: 161.37, createdAt: "2025-04-06 18:15:18.258" },
        { game: "PRAGMATIC", currency: "EUR", turnover: 75.20, createdAt: "2025-04-06 21:18:44.326" }
      ]
    },
    "SALAHU77": {
      username: "SALAHU77",
      games: [
        { game: "LUCKY365", currency: "MYR", turnover: 192.22, createdAt: "2025-04-06 18:15:18.258" }
      ]
    },
    "HENGZAI0108": {
      username: "HENGZAI0108",
      games: [
        { game: "LUCKY365", currency: "MYR", turnover: 980.10, createdAt: "2025-04-06 18:15:18.258" },
        { game: "PUSSY888", currency: "SGD", turnover: 215.75, createdAt: "2025-04-06 19:45:33.129" }
      ]
    }
  };
  
  /**
   * Exchange rates grouped by from-currency
   * Each from-currency has an object of to-currencies with their respective rates
   */
  export const exchangeRates = {
    "USD": {
      "MYR": 4.48,
      "EUR": 0.93,
      "GBP": 0.79,
      "JPY": 151.82,
      "AUD": 1.51,
      "SGD": 1.35,
      "CNY": 7.24,
      "INR": 83.39,
      "THB": 35.72
    },
    "EUR": {
      "USD": 1.08,
      "MYR": 4.83,
      "GBP": 0.85,
      "JPY": 164.01,
      "AUD": 1.63,
      "SGD": 1.46,
      "CNY": 7.81,
      "INR": 90.07,
      "THB": 38.57
    },
    "GBP": {
      "USD": 1.27,
      "EUR": 1.17,
      "MYR": 5.67,
      "JPY": 192.18,
      "AUD": 1.91,
      "SGD": 1.71,
      "CNY": 9.16,
      "INR": 105.56,
      "THB": 45.22
    },
    "MYR": {
      "USD": 0.22,
      "EUR": 0.21,
      "GBP": 0.18,
      "JPY": 33.89,
      "AUD": 0.34,
      "SGD": 0.30,
      "CNY": 1.62,
      "INR": 18.61,
      "THB": 7.97
    }
  };
  