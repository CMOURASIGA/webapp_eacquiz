
export type GameStatus = 'LOBBY' | 'QUESTION' | 'ANSWER_REVEAL' | 'LEADERBOARD' | 'FINAL';

export interface Question {
  id: string;
  pergunta: string;
  opcoes: string[]; // Exatamente 4 opções
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
  tempoNoPlacar: number; // Novo: Tempo de visualização do placar
  modoDeJogo: 'automatico' | 'manual';
}

export interface GameState {
  pin: string;
  status: GameStatus;
  perguntas: Question[];
  currentQuestionIndex: number;
  players: Record<string, Player>;
  tempoPorPergunta: number;
  tempoNoPlacar: number; // Novo: Sincronizado do backend
  modoDeJogo: 'automatico' | 'manual';
  questionStartTime: number;
  answers: Record<string, LastAnswer>;
  lastAnswers: Record<string, LastAnswer>;
  lastCorrectAnswer: number;
  leaderboard: LeaderboardEntry[];
}

export interface QuizSummary {
  id: string;
  nome: string;
}

export interface Quiz extends QuizSummary {
  perguntas: Question[];
}
