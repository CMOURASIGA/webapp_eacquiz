
import { GameState, GameSettings } from '../types/game';

/**
 * Utilitário para chamadas à API do Apps Script.
 * O Google Apps Script exige que usemos GET (doGet) para evitar problemas complexos de CORS em redirecionamentos.
 */
async function fetchGas(apiUrl: string, params: Record<string, any>) {
  if (!apiUrl) throw new Error("URL da API não configurada.");
  
  try {
    const url = new URL(apiUrl);
    // Adiciona timestamp para evitar cache do navegador
    url.searchParams.append('_t', Date.now().toString());
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow', // O Google redireciona de /exec para um servidor de conteúdo
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Servidor respondeu com erro: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'error' || data.error) {
      throw new Error(data.message || data.error || 'Erro desconhecido na planilha.');
    }
    
    return data;
  } catch (error: any) {
    console.error("Fetch Error:", error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error("Erro de Conexão: O navegador bloqueou a requisição. Certifique-se de que o Script foi implantado como 'Web App' e 'Anyone' tem acesso.");
    }
    throw error;
  }
}

export const gameService = {
  getQuizzes: async (apiUrl: string) => {
    const data = await fetchGas(apiUrl, { action: 'getQuizzes' });
    return data.quizzes || [];
  },

  createGameSession: async (apiUrl: string, quizId: string, settings: GameSettings) => {
    return fetchGas(apiUrl, { 
      action: 'createGameSession', 
      quizId, 
      tempoPorPergunta: settings.tempoPorPergunta,
      modoDeJogo: settings.modoDeJogo 
    });
  },

  joinGame: async (apiUrl: string, pin: string, playerName: string, avatar: string) => {
    const data = await fetchGas(apiUrl, { 
      action: 'joinGame', 
      pin, 
      nome: playerName, 
      avatar 
    });
    return { gameState: data.gameState, playerId: playerName }; 
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
      tempoGasto: timeSpent / 1000 
    });
  },

  nextGameState: async (apiUrl: string, pin: string, hostId: string) => {
    return fetchGas(apiUrl, { action: 'nextGameState', pin, hostId });
  }
};
