
export type GameStatus = 'LOBBY' | 'QUESTION' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINAL';

export interface Question {
  id: string;
  pergunta: string;
  opcoes: string[]; // Exactly 4 options
  corretaIdx: number;
}

export interface Player {
  id: string;
  nome: string;
  avatar: string; // emoji
  score: number;
  correctCount: number;
}

export interface LastAnswer {
  respostaIdx: number | null;
  points: number;
}

export interface LeaderboardEntry {
  playerId: string;
  nome: string;
  avatar: string;
  score: number;
  correctCount: number;
}

export interface GameSettings {
  tempoPorPergunta: number;
  modoDeJogo: 'automatico' | 'manual';
}

export interface GameState {
  pin: string;
  status: GameStatus;
  perguntas: Question[];
  currentQuestionIndex: number;
  players: Record<string, Player>;
  tempoPorPergunta: number;
  modoDeJogo: 'automatico' | 'manual';
  questionStartTime: number;
  answers: Record<string, LastAnswer>;
  lastAnswers: Record<string, LastAnswer>;
  lastCorrectAnswer: number;
  leaderboard: LeaderboardEntry[];
}

export interface Quiz {
  id: string;
  nome: string;
  perguntas: Question[];
}
