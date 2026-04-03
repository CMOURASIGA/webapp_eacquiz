const ensureApiUrl = (apiUrl) => {
  if (!apiUrl) throw new Error('URL da API não configurada.');
};

const parseApiResponse = async (response) => {
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

  const data = await response.json();
  if (data.status === 'error') throw new Error(data.message || 'Erro na planilha.');
  return data;
};

const getRequest = async (apiUrl, params) => {
  ensureApiUrl(apiUrl);

  const queryString = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const separator = apiUrl.includes('?') ? '&' : '?';
  const finalUrl = `${apiUrl}${separator}${queryString}&_cache=${Date.now()}`;

  const response = await fetch(finalUrl, {
    method: 'GET',
    mode: 'cors',
    redirect: 'follow',
  });

  return parseApiResponse(response);
};

const postRequest = async (apiUrl, payload) => {
  ensureApiUrl(apiUrl);

  const response = await fetch(apiUrl, {
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

export const getQuiz = async (apiUrl) => {
  return getRequest(apiUrl, { action: 'getActiveAsyncQuiz' });
};

export const getRanking = async (apiUrl, month) => {
  const params = { action: 'getMonthlyRanking' };
  if (month) params.month = month;
  return getRequest(apiUrl, params);
};

export const getResultsPanel = async (apiUrl, month, limit) => {
  const params = { action: 'getResultsPanel' };
  if (month) params.month = month;
  if (typeof limit === 'number') params.limit = String(limit);
  return getRequest(apiUrl, params);
};

export const getAsyncPrize = async (apiUrl, month) => {
  const params = { action: 'getAsyncPrize' };
  if (month) params.month = month;
  return getRequest(apiUrl, params);
};

export const getAsyncEligibility = async (apiUrl, userId, quizId, month) => {
  const params = { action: 'getAsyncEligibility', userId, quizId };
  if (month) params.month = month;
  return getRequest(apiUrl, params);
};

export const getAllowedParticipants = async (apiUrl) => {
  return getRequest(apiUrl, { action: 'getAllowedParticipants' });
};

export const getAsyncTokenStats = async (apiUrl, month, quizId) => {
  const params = { action: 'getAsyncTokenStats', month, quizId };
  return getRequest(apiUrl, params);
};

export const saveResult = async (apiUrl, payload) => {
  return postRequest(apiUrl, {
    action: 'saveResult',
    userId: payload.userId,
    nome: payload.nome,
    quizId: payload.quizId,
    pontuacao: payload.pontuacao,
    data: payload.data,
    token: payload.token,
    deviceId: payload.deviceId,
    month: payload.month,
  });
};

export const generateAsyncTokens = async (apiUrl, payload) => {
  return postRequest(apiUrl, {
    action: 'generateAsyncTokens',
    quizId: payload.quizId,
    month: payload.month,
    quantity: payload.quantity,
  });
};

export const claimAsyncToken = async (apiUrl, payload) => {
  return postRequest(apiUrl, {
    action: 'claimAsyncToken',
    quizId: payload.quizId,
    month: payload.month,
    userId: payload.userId,
    nome: payload.nome,
    deviceId: payload.deviceId,
  });
};

export const saveAsyncPrize = async (apiUrl, payload) => {
  return postRequest(apiUrl, {
    action: 'saveAsyncPrize',
    month: payload.month,
    title: payload.title,
    imageUrl: payload.imageUrl,
    sourceUrl: payload.sourceUrl,
  });
};
