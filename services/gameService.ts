
import { GameState, GameSettings, GameStatus, Player, Question, LastAnswer, LeaderboardEntry } from '../types/game';
import { quizService } from './quizService';

// Global in-memory state for mock
const games: Record<string, GameState> = {};

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

const updateLeaderboard = (gameState: GameState): LeaderboardEntry[] => {
  return Object.values(gameState.players)
    .map(p => ({
      playerId: p.id,
      nome: p.nome,
      avatar: p.avatar,
      score: p.score,
      correctCount: p.correctCount
    }))
    .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount);
};

export const gameService = {
  getQuizzes: quizService.getQuizzes,

  createGameSession: async (quizId: string, settings: GameSettings): Promise<{ pin: string }> => {
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) throw new Error("Quiz not found");

    const pin = generatePin();
    const initialState: GameState = {
      pin,
      status: 'LOBBY',
      perguntas: quiz.perguntas,
      currentQuestionIndex: 0,
      players: {},
      tempoPorPergunta: settings.tempoPorPergunta,
      modoDeJogo: settings.modoDeJogo,
      questionStartTime: 0,
      answers: {},
      lastAnswers: {},
      lastCorrectAnswer: -1,
      leaderboard: []
    };

    games[pin] = initialState;
    return { pin };
  },

  joinGame: async (pin: string, playerName: string, avatar: string): Promise<{ gameState: GameState; playerId: string }> => {
    const game = games[pin];
    if (!game) throw new Error("PIN Inválido");
    if (game.status !== 'LOBBY') throw new Error("Jogo já iniciado");

    const playerId = Math.random().toString(36).substring(7);
    const newPlayer: Player = {
      id: playerId,
      nome: playerName,
      avatar,
      score: 0,
      correctCount: 0
    };

    game.players[playerId] = newPlayer;
    game.leaderboard = updateLeaderboard(game);
    
    return { gameState: { ...game }, playerId };
  },

  startGame: async (pin: string): Promise<void> => {
    const game = games[pin];
    if (!game) return;
    
    game.status = 'QUESTION';
    game.currentQuestionIndex = 0;
    game.questionStartTime = Date.now();
    game.answers = {};
  },

  getGameState: async (pin: string): Promise<GameState | null> => {
    return games[pin] ? { ...games[pin] } : null;
  },

  submitAnswer: async (pin: string, playerId: string, answerIdx: number, timeSpentMs: number): Promise<{ pointsEarned: number }> => {
    const game = games[pin];
    if (!game || game.status !== 'QUESTION') return { pointsEarned: 0 };

    const currentQuestion = game.perguntas[game.currentQuestionIndex];
    const isCorrect = answerIdx === currentQuestion.corretaIdx;
    
    let pointsEarned = 0;
    if (isCorrect) {
      // Base 1000 points, losing value over time (up to 50% loss at max time)
      const maxTime = game.tempoPorPergunta * 1000;
      const timeFactor = Math.max(0.5, 1 - (timeSpentMs / maxTime));
      pointsEarned = Math.round(1000 * timeFactor);
      
      game.players[playerId].score += pointsEarned;
      game.players[playerId].correctCount += 1;
    }

    game.answers[playerId] = { respostaIdx: answerIdx, points: pointsEarned };
    return { pointsEarned };
  },

  nextGameState: async (pin: string): Promise<void> => {
    const game = games[pin];
    if (!game) return;

    switch (game.status) {
      case 'QUESTION':
        game.status = 'ANSWER_REVEAL';
        game.lastCorrectAnswer = game.perguntas[game.currentQuestionIndex].corretaIdx;
        game.lastAnswers = { ...game.answers };
        game.leaderboard = updateLeaderboard(game);
        break;
      
      case 'ANSWER_REVEAL':
        game.status = 'LEADERBOARD';
        break;
      
      case 'LEADERBOARD':
        if (game.currentQuestionIndex < game.perguntas.length - 1) {
          game.currentQuestionIndex += 1;
          game.status = 'QUESTION';
          game.questionStartTime = Date.now();
          game.answers = {};
        } else {
          game.status = 'FINAL';
        }
        break;
      
      default:
        break;
    }
  }
};
