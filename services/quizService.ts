
import { getQuiz, getRanking, getResultsPanel as getResultsPanelApi, getAsyncPrize as getAsyncPrizeApi, getAsyncEligibility as getAsyncEligibilityApi, getAllowedParticipants as getAllowedParticipantsApi, getAsyncTokenStats as getAsyncTokenStatsApi, saveResult as saveResultApi, saveAsyncPrize as saveAsyncPrizeApi, generateAsyncTokens as generateAsyncTokensApi, claimAsyncToken as claimAsyncTokenApi } from './apiService.js';
import { AsyncPrize, AsyncQuestion, AsyncQuiz, AsyncQuizResult } from '../types/asyncQuiz';
import { calculateScore } from '../utils/score';
import { LeaderboardEntry } from '../types/game';

const ASYNC_QUIZ_CACHE_KEY = 'eac_async_quiz_cache';
const ASYNC_RANKING_CACHE_KEY = 'eac_async_ranking_cache';
const ASYNC_ALLOWED_PARTICIPANTS_CACHE_KEY = 'eac_async_allowed_participants_cache';
const PENDING_RESULTS_KEY = 'eac_async_pending_results';

export interface ResultRow {
  timestamp: string;
  userId: string;
  nome: string;
  quizId: string;
  pontuacao: number;
  data: string;
}

export interface ResultsPanelData {
  month: string;
  leaderboard: LeaderboardEntry[];
  latestResults: ResultRow[];
  totalPlayers: number;
  totalResults: number;
  prize: AsyncPrize | null;
}

export interface AsyncEligibility {
  month: string;
  canPlay: boolean;
  reason: string;
  existingScore: number | null;
}

export interface AsyncTokenStats {
  month: string;
  quizId: string;
  total: number;
  available: number;
  reserved: number;
  completed: number;
  expired: number;
}

export interface AsyncTokenClaim {
  month: string;
  quizId: string;
  token: string | null;
  canPlay: boolean;
  reason: string;
  existingScore: number | null;
  expiresAt: string;
}

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const readCache = <T>(key: string): T | null => {
  if (!hasStorage()) return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: any) => {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
};

const removeCache = (key: string) => {
  if (!hasStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
};

const mapAsyncQuiz = (data: any): AsyncQuiz | null => {
  if (!data?.quiz) return null;

  const perguntas: AsyncQuestion[] = (data.questions || []).map((question: any, idx: number) => {
    const options = Array.isArray(question.opcoes) ? question.opcoes : [];
    return {
      id: question.id || `a${idx + 1}`,
      pergunta: String(question.pergunta || '').trim(),
      opcoes: options.map((opt: any) => String(opt || '')),
      corretaIdx: Number(question.corretaIdx),
    };
  }).filter((question: AsyncQuestion) => {
    return question.pergunta && question.opcoes.length === 4 && question.corretaIdx >= 0 && question.corretaIdx <= 3;
  });

  return {
    id: String(data.quiz.id || '').trim(),
    nome: String(data.quiz.nome || data.quiz.id || '').trim(),
    perguntas,
  };
};

const readPendingResults = () => readCache<Array<{
  userId: string;
  nome: string;
  quizId: string;
  pontuacao: number;
  data: string;
}>>(PENDING_RESULTS_KEY) || [];

const writePendingResults = (items: Array<{
  userId: string;
  nome: string;
  quizId: string;
  pontuacao: number;
  data: string;
}>) => writeCache(PENDING_RESULTS_KEY, items);

const flushPendingResults = async (apiUrl: string) => {
  const pending = readPendingResults();
  if (!pending.length) return;

  const remaining = [...pending];

  while (remaining.length > 0) {
    const next = remaining[0];
    try {
      await saveResultApi(apiUrl, next);
      remaining.shift();
    } catch {
      break;
    }
  }

  writePendingResults(remaining);
};

export const quizService = {
  formatQuizName: (name: string) => name.trim(),

  getActiveAsyncQuiz: async (apiUrl: string): Promise<AsyncQuiz | null> => {
    try {
      const data = await getQuiz(apiUrl);
      const mapped = mapAsyncQuiz(data);

      if (mapped) writeCache(ASYNC_QUIZ_CACHE_KEY, mapped);
      else removeCache(ASYNC_QUIZ_CACHE_KEY);

      return mapped;
    } catch (error) {
      const fallbackQuiz = readCache<AsyncQuiz>(ASYNC_QUIZ_CACHE_KEY);
      if (fallbackQuiz) return fallbackQuiz;
      throw error;
    }
  },

  evaluateAsyncAnswers: (questions: AsyncQuestion[], answers: number[], tempos: number[]): AsyncQuizResult => {
    const acertos = questions.reduce((acc, question, idx) => {
      if (answers[idx] === question.corretaIdx) return acc + 1;
      return acc;
    }, 0);

    const pontuacao = questions.reduce((acc, question, idx) => {
      const correta = answers[idx] === question.corretaIdx;
      const tempo = tempos[idx] ?? 1;
      return acc + calculateScore({ correta, tempo });
    }, 0);

    return {
      total: questions.length,
      acertos,
      pontuacao,
      respondidas: answers.filter((ans) => ans !== -1).length,
    };
  },

  saveResult: async (apiUrl: string, payload: {
    userId: string;
    nome: string;
    quizId: string;
    pontuacao: number;
    data: string;
    token?: string;
    deviceId?: string;
    month?: string;
  }) => {
    try {
      await flushPendingResults(apiUrl);
      return await saveResultApi(apiUrl, payload);
    } catch {
      const pending = readPendingResults();
      pending.push(payload);
      writePendingResults(pending);
      return { status: 'queued', message: 'Resultado salvo localmente e será reenviado quando a conexão voltar.' };
    }
  },

  getMonthlyRanking: async (apiUrl: string, month?: string): Promise<{ month: string; leaderboard: LeaderboardEntry[] }> => {
    try {
      const data = await getRanking(apiUrl, month);
      const parsed = {
        month: String(data.month || ''),
        leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [],
      };

      writeCache(ASYNC_RANKING_CACHE_KEY, parsed);
      return parsed;
    } catch (error) {
      const fallbackRanking = readCache<{ month: string; leaderboard: LeaderboardEntry[] }>(ASYNC_RANKING_CACHE_KEY);
      if (fallbackRanking) return fallbackRanking;
      throw error;
    }
  },

  getResultsPanel: async (apiUrl: string, month?: string, limit = 50): Promise<ResultsPanelData> => {
    const data = await getResultsPanelApi(apiUrl, month, limit);
    return {
      month: String(data.month || ''),
      leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [],
      latestResults: Array.isArray(data.latestResults) ? data.latestResults : [],
      totalPlayers: Number(data.totalPlayers || 0),
      totalResults: Number(data.totalResults || 0),
      prize: data?.prize ? {
        month: String(data.prize.month || data.month || ''),
        title: String(data.prize.title || ''),
        imageUrl: String(data.prize.imageUrl || ''),
        sourceUrl: String(data.prize.sourceUrl || ''),
        updatedAt: String(data.prize.updatedAt || ''),
      } : null,
    };
  },

  getAsyncEligibility: async (apiUrl: string, payload: { userId: string; quizId: string; month?: string }): Promise<AsyncEligibility> => {
    const data = await getAsyncEligibilityApi(apiUrl, payload.userId, payload.quizId, payload.month);
    return {
      month: String(data.month || ''),
      canPlay: !!data.canPlay,
      reason: String(data.reason || ''),
      existingScore: typeof data.existingScore === 'number' ? data.existingScore : null,
    };
  },

  getAllowedParticipants: async (apiUrl: string): Promise<string[]> => {
    try {
      const data = await getAllowedParticipantsApi(apiUrl);
      const participants = Array.isArray(data?.participants)
        ? data.participants.map((name: any) => String(name || '').trim()).filter(Boolean)
        : [];

      writeCache(ASYNC_ALLOWED_PARTICIPANTS_CACHE_KEY, participants);
      return participants;
    } catch (error) {
      const fallback = readCache<string[]>(ASYNC_ALLOWED_PARTICIPANTS_CACHE_KEY);
      if (fallback && Array.isArray(fallback) && fallback.length > 0) return fallback;
      throw error;
    }
  },

  getAsyncTokenStats: async (apiUrl: string, payload: { month: string; quizId: string }): Promise<AsyncTokenStats> => {
    const data = await getAsyncTokenStatsApi(apiUrl, payload.month, payload.quizId);
    return {
      month: String(data.month || payload.month || ''),
      quizId: String(data.quizId || payload.quizId || ''),
      total: Number(data.total || 0),
      available: Number(data.available || 0),
      reserved: Number(data.reserved || 0),
      completed: Number(data.completed || 0),
      expired: Number(data.expired || 0),
    };
  },

  generateAsyncTokens: async (apiUrl: string, payload: { month: string; quizId: string; quantity: number }) => {
    return generateAsyncTokensApi(apiUrl, payload);
  },

  claimAsyncToken: async (apiUrl: string, payload: { month?: string; quizId: string; userId: string; nome: string; deviceId: string }): Promise<AsyncTokenClaim> => {
    const data = await claimAsyncTokenApi(apiUrl, payload);
    return {
      month: String(data.month || payload.month || ''),
      quizId: String(data.quizId || payload.quizId || ''),
      token: data.token ? String(data.token) : null,
      canPlay: !!data.canPlay,
      reason: String(data.reason || ''),
      existingScore: typeof data.existingScore === 'number' ? data.existingScore : null,
      expiresAt: String(data.expiresAt || ''),
    };
  },

  getAsyncPrize: async (apiUrl: string, month?: string): Promise<AsyncPrize | null> => {
    const data = await getAsyncPrizeApi(apiUrl, month);
    if (!data?.prize) return null;

    return {
      month: String(data.prize.month || data.month || ''),
      title: String(data.prize.title || ''),
      imageUrl: String(data.prize.imageUrl || ''),
      sourceUrl: String(data.prize.sourceUrl || ''),
      updatedAt: String(data.prize.updatedAt || ''),
    };
  },

  saveAsyncPrize: async (apiUrl: string, payload: {
    month: string;
    title: string;
    imageUrl: string;
    sourceUrl?: string;
  }): Promise<AsyncPrize> => {
    const data = await saveAsyncPrizeApi(apiUrl, payload);
    return {
      month: String(data?.prize?.month || payload.month || ''),
      title: String(data?.prize?.title || payload.title || ''),
      imageUrl: String(data?.prize?.imageUrl || payload.imageUrl || ''),
      sourceUrl: String(data?.prize?.sourceUrl || payload.sourceUrl || ''),
      updatedAt: String(data?.prize?.updatedAt || ''),
    };
  },
};
