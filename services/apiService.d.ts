export interface SaveResultPayload {
  userId: string;
  nome: string;
  quizId: string;
  pontuacao: number;
  data: string;
  token?: string;
  deviceId?: string;
  month?: string;
}

export interface SaveAsyncPrizePayload {
  month: string;
  title: string;
  imageUrl: string;
  sourceUrl?: string;
}

export interface GenerateAsyncTokensPayload {
  quizId: string;
  month: string;
  quantity: number;
}

export interface ClaimAsyncTokenPayload {
  quizId: string;
  month?: string;
  userId: string;
  nome: string;
  deviceId: string;
}

export function getQuiz(apiUrl: string): Promise<any>;
export function getRanking(apiUrl: string, month?: string): Promise<any>;
export function getResultsPanel(apiUrl: string, month?: string, limit?: number): Promise<any>;
export function getAsyncPrize(apiUrl: string, month?: string): Promise<any>;
export function getAsyncEligibility(apiUrl: string, userId: string, quizId: string, month?: string): Promise<any>;
export function getAllowedParticipants(apiUrl: string): Promise<any>;
export function getAsyncTokenStats(apiUrl: string, month: string, quizId: string): Promise<any>;
export function saveResult(apiUrl: string, payload: SaveResultPayload): Promise<any>;
export function saveAsyncPrize(apiUrl: string, payload: SaveAsyncPrizePayload): Promise<any>;
export function generateAsyncTokens(apiUrl: string, payload: GenerateAsyncTokensPayload): Promise<any>;
export function claimAsyncToken(apiUrl: string, payload: ClaimAsyncTokenPayload): Promise<any>;
