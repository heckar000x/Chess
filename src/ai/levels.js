/**
 * 10 difficulty levels
 * Each maps to depth, time, and deliberate weaknesses
 */

export const LEVELS = [
  {
    id: 1,
    name: "Beginner",
    subtitle: "Learning the moves",
    elo: 400,
    depth: 1,
    timeMs: 300,
    blunderRate: 0.45,
    randomness: 0.6,
    useTT: false,
    evaluationNoise: 120,
    description: "Makes frequent mistakes, misses tactics."
  },
  {
    id: 2,
    name: "Easy",
    subtitle: "Casual opponent",
    elo: 700,
    depth: 1,
    timeMs: 400,
    blunderRate: 0.35,
    randomness: 0.45,
    useTT: false,
    evaluationNoise: 90
  },
  {
    id: 3,
    name: "Casual",
    subtitle: "Friendly game",
    elo: 950,
    depth: 2,
    timeMs: 600,
    blunderRate: 0.25,
    randomness: 0.35,
    useTT: true,
    evaluationNoise: 60
  },
  {
    id: 4,
    name: "Intermediate",
    subtitle: "Knows fundamentals",
    elo: 1150,
    depth: 2,
    timeMs: 900,
    blunderRate: 0.18,
    randomness: 0.28,
    useTT: true,
    evaluationNoise: 45
  },
  {
    id: 5,
    name: "Skilled",
    subtitle: "Club player",
    elo: 1350,
    depth: 3,
    timeMs: 1200,
    blunderRate: 0.12,
    randomness: 0.20,
    useTT: true,
    evaluationNoise: 30
  },
  {
    id: 6,
    name: "Advanced",
    subtitle: "Tournament ready",
    elo: 1550,
    depth: 3,
    timeMs: 1800,
    blunderRate: 0.08,
    randomness: 0.15,
    useTT: true,
    evaluationNoise: 20
  },
  {
    id: 7,
    name: "Expert",
    subtitle: "Brilliant tactician",
    elo: 1750,
    depth: 4,
    timeMs: 2500,
    blunderRate: 0.04,
    randomness: 0.10,
    useTT: true,
    evaluationNoise: 10
  },
  {
    id: 8,
    name: "Master",
    subtitle: "Near perfection",
    elo: 1950,
    depth: 4,
    timeMs: 3500,
    blunderRate: 0.015,
    randomness: 0.06,
    useTT: true,
    evaluationNoise: 5
  },
  {
    id: 9,
    name: "Grandmaster",
    subtitle: "Elite precision",
    elo: 2150,
    depth: 5,
    timeMs: 4500,
    blunderRate: 0.005,
    randomness: 0.02,
    useTT: true,
    evaluationNoise: 0
  },
  {
    id: 10,
    name: "FOUR MINDS — OMEGA",
    subtitle: "Synchronized Legion",
    elo: 2450,
    depth: 5,
    timeMs: 6000,
    blunderRate: 0,
    randomness: 0,
    useTT: true,
    evaluationNoise: 0,
    isOmega: true,
    omega: {
      predictorDepth: 2,
      calculatorDepth: 5,
      confirmerDepth: 4,
      breadth: 6,
      timeBudgetMs: 7000
    }
  }
];

export function getLevel(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

export function nextLevel(id){ return Math.min(10, id+1); }
