
import { GameState, GameSettings, QuizSummary } from '../types/game';

/**
 * Utilitário para chamadas à API do Apps Script.
 */
async function fetchGas(apiUrl: string, params: Record<string, any>) {
  if (!apiUrl) throw new Error("URL da API não configurada.");
  
  try {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const separator = apiUrl.includes('?') ? '&' : '?';
    const finalUrl = `${apiUrl}${separator}${queryString}&_cache=${Date.now()}`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'Erro reportado pela planilha.');
    }
    
    return data;
  } catch (error: any) {
    console.error("Erro na comunicação com a API:", error);
    if (error.message === 'Failed to fetch') {
      throw new Error("Erro de conexão. Verifique se o Script está publicado como 'Anyone'.");
    }
    throw error;
  }
}

export const gameService = {
  getQuizzes: async (apiUrl: string): Promise<QuizSummary[]> => {
    const data = await fetchGas(apiUrl, { action: 'getQuizzes' });
    return data.quizzes || [];
  },

  createGameSession: async (apiUrl: string, quizId: string, settings: GameSettings) => {
    const data = await fetchGas(apiUrl, { 
      action: 'createGameSession', 
      quizId, 
      tempoPorPergunta: settings.tempoPorPergunta,
      modoDeJogo: settings.modoDeJogo 
    });
    return { pin: data.pin, hostId: data.hostId };
  },

  joinGame: async (apiUrl: string, pin: string, playerName: string, avatar: string) => {
    const data = await fetchGas(apiUrl, { 
      action: 'joinGame', 
      pin, 
      nome: playerName, 
      avatar 
    });
    return { gameState: data.gameState, playerId: data.playerId || playerName }; 
  },

  getGameState: async (apiUrl: string, pin: string): Promise<GameState | null> => {
    try {
      const data = await fetchGas(apiUrl, { action: 'getGameState', pin });
      return data.gameState;
    } catch (e) {
      return null;
    }
  },

  startGame: async (apiUrl: string, pin: string, hostId: string) => {
    return fetchGas(apiUrl, { action: 'startGame', pin, hostId });
  },

  submitAnswer: async (apiUrl: string, pin: string, playerName: string, answerIdx: number, timeSpent: number) => {
    return fetchGas(apiUrl, { 
      action: 'submitAnswer', 
      pin, 
      nome: playerName, 
      respostaIdx: answerIdx, 
      tempoGasto: timeSpent 
    });
  },

  nextGameState: async (apiUrl: string, pin: string, hostId: string) => {
    return fetchGas(apiUrl, { action: 'nextGameState', pin, hostId });
  }
};
