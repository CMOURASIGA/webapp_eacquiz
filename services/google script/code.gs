/**
 * BACKEND EAC QUIZ - VERSÃO FINAL (quiz_perguntas)
 * Copie este código e cole no seu Apps Script
 */
function normalizeKey_(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

function findColumnIndex_(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeKey_);
  for (let i = 0; i < headers.length; i++) {
    if (normalizedAliases.indexOf(normalizeKey_(headers[i])) >= 0) return i;
  }
  return -1;
}

function parseBoolean_(value) {
  const normalized = normalizeKey_(value);
  return ['true', '1', 'sim', 'yes', 'y', 'ativo', 'ok', 'x'].indexOf(normalized) >= 0;
}

function matchesMode_(quizMode, expectedMode) {
  const mode = normalizeKey_(quizMode);
  const expected = normalizeKey_(expectedMode);

  if (expected === 'live') {
    return mode === 'live' || mode === 'aovivo' || mode === 'ao vivo';
  }

  return mode === expected;
}

function isWithinDateRange_(targetDate, startDate, endDate) {
  if (startDate) {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    if (targetDate < start) return false;
  }

  if (endDate) {
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    if (targetDate > end) return false;
  }

  return true;
}

const PARTICIPANTS_CACHE_KEY_ = 'allowed_participants_v1';
const PARTICIPANTS_CACHE_TTL_SECONDS_ = 300;
const PARTICIPANT_SOURCES_ = [
  {
    spreadsheetId: '1M5vsAANmeYk1pAgYjFfa3ycbnyWMGYb90pKZuR9zNo4',
    sheetName: 'Base_Contatos',
    columnIndex: 1,
  },
  {
    spreadsheetId: '1ldHCdVQiOV8EU3aN9wTiqj6rje34tZpSvB1O-09HG0E',
    sheetName: 'base de dados',
    columnIndex: 2,
  },
];

function stripAccents_(value) {
  const text = (value || '').toString();
  try {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (err) {
    return text;
  }
}

function normalizeParticipantName_(value) {
  return (value || '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeParticipantKey_(value) {
  const normalized = normalizeParticipantName_(value);
  if (!normalized) return '';
  return stripAccents_(normalized).toLowerCase();
}

function readParticipantNamesFromSource_(source) {
  const externalSpreadsheet = SpreadsheetApp.openById(source.spreadsheetId);
  const sheet = externalSpreadsheet.getSheetByName(source.sheetName);
  if (!sheet) {
    throw new Error("Aba '" + source.sheetName + "' não encontrada na planilha " + source.spreadsheetId + '.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  const values = sheet.getRange(1, source.columnIndex, lastRow, 1).getValues();
  let names = values
    .map((row) => normalizeParticipantName_(row[0]))
    .filter(Boolean);

  if (names.length > 0) {
    const first = normalizeParticipantKey_(names[0]);
    if (first === 'nome' || first === 'nomes') {
      names = names.slice(1);
    }
  }

  return names;
}

function getAllowedParticipants_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(PARTICIPANTS_CACHE_KEY_);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      // noop
    }
  }

  const uniqueByKey = {};
  PARTICIPANT_SOURCES_.forEach((source) => {
    const names = readParticipantNamesFromSource_(source);
    names.forEach((name) => {
      const key = normalizeParticipantKey_(name);
      if (key && !uniqueByKey[key]) {
        uniqueByKey[key] = name;
      }
    });
  });

  const participants = Object.keys(uniqueByKey)
    .map((key) => uniqueByKey[key])
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  cache.put(PARTICIPANTS_CACHE_KEY_, JSON.stringify(participants), PARTICIPANTS_CACHE_TTL_SECONDS_);
  return participants;
}

function getControlledQuizzes_(ss) {
  const QUIZZES_SHEET_NAME = 'QUIZZES';
  const quizzesSheet = ss.getSheetByName(QUIZZES_SHEET_NAME);
  if (!quizzesSheet) throw new Error("Aba '" + QUIZZES_SHEET_NAME + "' não encontrada na planilha.");

  const rows = quizzesSheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const headers = rows[0];
  const idxQuizId = findColumnIndex_(headers, ['quizId']);
  const idxTitulo = findColumnIndex_(headers, ['titulo']);
  const idxAtivo = findColumnIndex_(headers, ['ativo']);
  const idxModo = findColumnIndex_(headers, ['modo']);
  const idxDataInicio = findColumnIndex_(headers, ['dataInicio']);
  const idxDataFim = findColumnIndex_(headers, ['dataFim']);

  if (
    idxQuizId < 0 ||
    idxTitulo < 0 ||
    idxAtivo < 0 ||
    idxModo < 0 ||
    idxDataInicio < 0 ||
    idxDataFim < 0
  ) {
    throw new Error("A aba QUIZZES deve ter as colunas: quizId | titulo | ativo | modo | dataInicio | dataFim.");
  }

  return rows.slice(1).map((row) => {
    const quizId = (row[idxQuizId] || '').toString().trim();
    const titulo = (row[idxTitulo] || quizId).toString().trim();
    const ativo = parseBoolean_(row[idxAtivo]);
    const modo = normalizeKey_(row[idxModo]);
    const dataInicio = toDateValue_(row[idxDataInicio]);
    const dataFim = toDateValue_(row[idxDataFim]);

    return {
      quizId: quizId,
      titulo: titulo || quizId,
      ativo: ativo,
      modo: modo,
      dataInicio: dataInicio,
      dataFim: dataFim
    };
  }).filter((quiz) => !!quiz.quizId);
}

function getAvailableControlledQuizzes_(ss, expectedMode, nowDate) {
  const now = nowDate || new Date();
  return getControlledQuizzes_(ss).filter((quiz) => {
    if (!quiz.ativo) return false;
    if (!matchesMode_(quiz.modo, expectedMode)) return false;
    return isWithinDateRange_(now, quiz.dataInicio, quiz.dataFim);
  });
}

function buildQuestionsByQuizId_(rows, targetQuizId) {
  return rows.slice(1)
    .filter(row => row[0] && row[0].toString().trim() === targetQuizId)
    .map((row, i) => {
      const letraCorreta = (row[7] || "").toString().trim().toUpperCase();
      const corretaIdx = letraCorreta.charCodeAt(0) - 65; // A=0, B=1...

      return {
        id: row[1] || ('q' + i),
        pergunta: row[2],
        opcoes: [row[3], row[4], row[5], row[6]],
        corretaIdx: corretaIdx
      };
    })
    .filter(q => q.opcoes.length === 4 && q.corretaIdx >= 0 && q.corretaIdx <= 3);
}

function calculateScore(params) {
  const correta = !!params.correta;
  const tempo = Number(params.tempo || 0);
  if (!correta) return 0;

  const normalizedTempo = Math.max(0, Math.min(1, tempo));
  const scoreBySpeed = Math.floor(1000 * (1 - normalizedTempo));
  return Math.max(500, scoreBySpeed);
}

function getOrCreateResultsSheet_(ss) {
  const sheetName = 'RESULTADOS';
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp', 'userId', 'nome', 'quizId', 'pontuacao', 'data']);
  }

  return sheet;
}

function getResultsColumns_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp', 'userId', 'nome', 'quizId', 'pontuacao', 'data']);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columns = {
    timestamp: findColumnIndex_(headers, ['timestamp']),
    userId: findColumnIndex_(headers, ['userId']),
    nome: findColumnIndex_(headers, ['nome']),
    quizId: findColumnIndex_(headers, ['quizId']),
    pontuacao: findColumnIndex_(headers, ['pontuacao']),
    data: findColumnIndex_(headers, ['data']),
  };

  if (columns.userId < 0 || columns.quizId < 0 || columns.pontuacao < 0) {
    throw new Error("A aba RESULTADOS deve ter as colunas: userId, quizId, pontuacao.");
  }

  return columns;
}

function toDateValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  if (value === null || value === undefined) return null;

  const text = value.toString().trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function monthKey_(dateObj) {
  const year = dateObj.getFullYear();
  const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  return year + '-' + month;
}

function resolveResultDate_(value) {
  const parsed = toDateValue_(value);
  if (parsed) return parsed;
  return new Date();
}

function normalizeMonthParam_(rawMonth) {
  const monthParam = (rawMonth || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM')).toString().trim();
  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    throw new Error("Parâmetro 'month' deve estar no formato yyyy-MM.");
  }
  return monthParam;
}

function formatDateTime_(dateObj) {
  if (!dateObj) return '';
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatDateOnly_(dateObj) {
  if (!dateObj) return '';
  return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function buildMonthlyResultsData_(resultsSheet, monthParam) {
  const rows = resultsSheet.getDataRange().getValues();
  const columns = getResultsColumns_(resultsSheet);
  const grouped = {};
  const latestResults = [];
  let totalResults = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const userId = (row[columns.userId] || '').toString().trim();
    if (!userId) continue;

    const nome = (columns.nome >= 0 ? (row[columns.nome] || '') : '').toString().trim() || 'Participante';
    const quizId = (columns.quizId >= 0 ? (row[columns.quizId] || '') : '').toString().trim();
    const pontuacao = Number(columns.pontuacao >= 0 ? (row[columns.pontuacao] || 0) : 0);

    const dataFromDataColumn = columns.data >= 0 ? toDateValue_(row[columns.data]) : null;
    const dataFromTimestamp = columns.timestamp >= 0 ? toDateValue_(row[columns.timestamp]) : null;
    const effectiveDate = dataFromDataColumn || dataFromTimestamp;
    if (!effectiveDate) continue;
    if (monthKey_(effectiveDate) !== monthParam) continue;

    totalResults += 1;

    if (!grouped[userId]) {
      grouped[userId] = {
        playerId: userId,
        nome: nome,
        avatar: '🏅',
        score: 0,
        correctCount: 0
      };
    }

    grouped[userId].score += isNaN(pontuacao) ? 0 : pontuacao;
    grouped[userId].correctCount += 1;
    if (nome) grouped[userId].nome = nome;

    const sortDate = dataFromTimestamp || effectiveDate;
    latestResults.push({
      timestamp: formatDateTime_(sortDate),
      userId: userId,
      nome: nome,
      quizId: quizId,
      pontuacao: isNaN(pontuacao) ? 0 : pontuacao,
      data: formatDateOnly_(effectiveDate),
      sortTime: sortDate ? sortDate.getTime() : 0
    });
  }

  const leaderboard = Object.keys(grouped)
    .map(function(key) { return grouped[key]; })
    .sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return a.nome.localeCompare(b.nome);
    });

  latestResults.sort(function(a, b) {
    return b.sortTime - a.sortTime;
  });

  const normalizedLatestResults = latestResults.map(function(item) {
    return {
      timestamp: item.timestamp,
      userId: item.userId,
      nome: item.nome,
      quizId: item.quizId,
      pontuacao: item.pontuacao,
      data: item.data
    };
  });

  return {
    leaderboard: leaderboard,
    latestResults: normalizedLatestResults,
    totalPlayers: leaderboard.length,
    totalResults: totalResults
  };
}

function normalizePrizeImageUrl_(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : ('https://' + raw);
  const pageImgurMatch = withProtocol.match(/^https?:\/\/(?:www\.)?imgur\.com\/([A-Za-z0-9]+)(?:[/?#].*)?$/i);
  if (pageImgurMatch) {
    return 'https://i.imgur.com/' + pageImgurMatch[1] + '.jpg';
  }

  return withProtocol;
}

function getAsyncPrizesMap_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('async_prizes_map');
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch (err) {
    return {};
  }
}

function setAsyncPrizesMap_(map) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('async_prizes_map', JSON.stringify(map || {}));
}

function getAsyncPrizeByMonth_(monthParam) {
  const map = getAsyncPrizesMap_();
  const prize = map[monthParam];
  if (!prize) return null;

  return {
    month: monthParam,
    title: (prize.title || '').toString().trim(),
    imageUrl: (prize.imageUrl || '').toString().trim(),
    sourceUrl: (prize.sourceUrl || '').toString().trim(),
    updatedAt: (prize.updatedAt || '').toString().trim(),
  };
}

function findExistingMonthlyResult_(resultsSheet, columns, userId, quizId, monthParam) {
  if (resultsSheet.getLastRow() < 2) return null;

  const allRows = resultsSheet.getDataRange().getValues();
  let best = null;

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const rowUserId = (row[columns.userId] || '').toString().trim();
    const rowQuizId = (row[columns.quizId] || '').toString().trim();
    if (rowUserId !== userId || rowQuizId !== quizId) continue;

    const rowDate = (columns.data >= 0 ? toDateValue_(row[columns.data]) : null) || (columns.timestamp >= 0 ? toDateValue_(row[columns.timestamp]) : null);
    if (!rowDate || monthKey_(rowDate) !== monthParam) continue;

    const rowScore = Number(columns.pontuacao >= 0 ? (row[columns.pontuacao] || 0) : 0);
    if (!best || rowScore > best.score) {
      best = {
        rowIndex: i + 1,
        score: isNaN(rowScore) ? 0 : rowScore,
        rowDate: rowDate,
      };
    }
  }

  return best;
}

function getCurrentMonthKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
}

function getOrCreateTokensSheet_(ss) {
  const sheetName = 'TOKENS';
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['token', 'quizId', 'month', 'status', 'deviceId', 'userId', 'nome', 'claimedAt', 'reservationExpiresAt', 'completedAt', 'score', 'createdAt']);
  }

  return sheet;
}

function ensureTokensHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['token', 'quizId', 'month', 'status', 'deviceId', 'userId', 'nome', 'claimedAt', 'reservationExpiresAt', 'completedAt', 'score', 'createdAt']);
    return;
  }

  const desiredHeaders = ['token', 'quizId', 'month', 'status', 'deviceId', 'userId', 'nome', 'claimedAt', 'reservationExpiresAt', 'completedAt', 'score', 'createdAt'];
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missing = desiredHeaders.filter(function(header) {
    if (header === 'month') {
      return findColumnIndex_(currentHeaders, ['month', 'mes']) < 0;
    }
    return findColumnIndex_(currentHeaders, [header]) < 0;
  });

  if (missing.length > 0) {
    const nextCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, nextCol, 1, missing.length).setValues([missing]);
  }
}

function getTokensColumns_(sheet) {
  ensureTokensHeaders_(sheet);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columns = {
    token: findColumnIndex_(headers, ['token']),
    quizId: findColumnIndex_(headers, ['quizId']),
    month: findColumnIndex_(headers, ['month', 'mes']),
    status: findColumnIndex_(headers, ['status']),
    deviceId: findColumnIndex_(headers, ['deviceId']),
    userId: findColumnIndex_(headers, ['userId']),
    nome: findColumnIndex_(headers, ['nome']),
    claimedAt: findColumnIndex_(headers, ['claimedAt', 'reservadoEm']),
    reservationExpiresAt: findColumnIndex_(headers, ['reservationExpiresAt', 'expiraEm', 'expiresAt']),
    completedAt: findColumnIndex_(headers, ['completedAt', 'concluidoEm']),
    score: findColumnIndex_(headers, ['score', 'pontuacao']),
    createdAt: findColumnIndex_(headers, ['createdAt', 'criadoEm']),
  };

  if (columns.token < 0 || columns.quizId < 0 || columns.month < 0 || columns.status < 0) {
    throw new Error("A aba TOKENS deve ter as colunas: token | quizId | month | status.");
  }

  return columns;
}

function createEmptyRow_(size) {
  const row = [];
  for (let i = 0; i < size; i++) {
    row.push('');
  }
  return row;
}

function getTokenValue_(row, colIndex) {
  if (colIndex < 0) return '';
  return (row[colIndex] || '').toString().trim();
}

function getTokenMonthKey_(value) {
  if (value === null || value === undefined) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return monthKey_(value);
  }

  const text = value.toString().trim();
  if (!text) return '';

  const directMonth = text.match(/^(\d{4})-(\d{2})$/);
  if (directMonth) {
    return directMonth[1] + '-' + directMonth[2];
  }

  const asDate = toDateValue_(text);
  if (asDate) return monthKey_(asDate);
  return text;
}

function setTokenCell_(sheet, rowIndex, colIndex, value) {
  if (colIndex < 0) return;
  sheet.getRange(rowIndex, colIndex + 1).setValue(value);
}

function normalizeTokenStatus_(value) {
  const normalized = normalizeKey_(value);
  if (!normalized) return '';
  if (normalized === 'available' || normalized === 'disponivel') return 'available';
  if (normalized === 'reserved' || normalized === 'reservado') return 'reserved';
  if (normalized === 'completed' || normalized === 'concluido') return 'completed';
  if (normalized === 'expired' || normalized === 'expirado') return 'expired';
  return normalized;
}

function isTokenReservationExpired_(row, columns, nowDate) {
  const status = normalizeTokenStatus_(row[columns.status]);
  if (status !== 'reserved') return false;
  const expiresAt = columns.reservationExpiresAt >= 0 ? toDateValue_(row[columns.reservationExpiresAt]) : null;
  if (!expiresAt) return false;
  return nowDate.getTime() > expiresAt.getTime();
}

function expireTokenReservationRow_(sheet, rowIndex, columns) {
  setTokenCell_(sheet, rowIndex, columns.status, 'expired');
  setTokenCell_(sheet, rowIndex, columns.reservationExpiresAt, '');
}

function generateTokenCode_(usedTokensMap) {
  let token = '';
  do {
    token = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  } while (usedTokensMap[token]);
  usedTokensMap[token] = true;
  return token;
}

function claimAsyncToken_(ss, payload) {
  const quizId = (payload.quizId || '').toString().trim();
  const deviceId = (payload.deviceId || '').toString().trim();
  const userId = (payload.userId || '').toString().trim();
  const nome = (payload.nome || '').toString().trim();
  const monthParam = normalizeMonthParam_(payload.month || getCurrentMonthKey_());

  if (!quizId) throw new Error("Campo 'quizId' é obrigatório.");
  if (!deviceId) throw new Error("Campo 'deviceId' é obrigatório.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const tokensSheet = getOrCreateTokensSheet_(ss);
    const columns = getTokensColumns_(tokensSheet);
    const rows = tokensSheet.getDataRange().getValues();
    const now = new Date();
    const ttlMinutes = 90;

    let existingCompleted = null;
    let existingReserved = null;
    let availableRowIndex = -1;
    let availableToken = '';

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowQuizId = getTokenValue_(row, columns.quizId);
      const rowMonth = getTokenMonthKey_(row[columns.month]);
      if (rowQuizId !== quizId || rowMonth !== monthParam) continue;

      const rowIndex = i + 1;
      let status = normalizeTokenStatus_(row[columns.status]);
      const rowToken = getTokenValue_(row, columns.token);
      const rowDeviceId = getTokenValue_(row, columns.deviceId);

      if (isTokenReservationExpired_(row, columns, now)) {
        expireTokenReservationRow_(tokensSheet, rowIndex, columns);
        status = 'expired';
      }

      if (rowDeviceId && rowDeviceId === deviceId) {
        if (status === 'completed') {
          const existingScore = Number(columns.score >= 0 ? row[columns.score] : 0);
          existingCompleted = {
            token: rowToken,
            existingScore: isNaN(existingScore) ? 0 : existingScore,
          };
        } else if (status === 'reserved') {
          const expiresAt = columns.reservationExpiresAt >= 0 ? toDateValue_(row[columns.reservationExpiresAt]) : null;
          existingReserved = {
            token: rowToken,
            expiresAt: formatDateTime_(expiresAt),
          };
        } else if (status === 'expired') {
          existingReserved = {
            token: rowToken,
            expiresAt: '',
          };
        }
      }

      if (availableRowIndex < 0 && rowToken && (status === '' || status === 'available')) {
        availableRowIndex = rowIndex;
        availableToken = rowToken;
      }
    }

    if (existingCompleted) {
      return {
        status: 'success',
        month: monthParam,
        quizId: quizId,
        token: existingCompleted.token,
        canPlay: false,
        reason: 'already_completed',
        existingScore: existingCompleted.existingScore,
        expiresAt: '',
      };
    }

    if (existingReserved) {
      return {
        status: 'success',
        month: monthParam,
        quizId: quizId,
        token: existingReserved.token,
        canPlay: false,
        reason: existingReserved.expiresAt ? 'already_reserved' : 'already_claimed',
        existingScore: null,
        expiresAt: existingReserved.expiresAt || '',
      };
    }

    if (availableRowIndex < 0) {
      return {
        status: 'success',
        month: monthParam,
        quizId: quizId,
        token: null,
        canPlay: false,
        reason: 'sold_out',
        existingScore: null,
        expiresAt: '',
      };
    }

    const claimedAt = new Date();
    const expiresAt = new Date(claimedAt.getTime() + (ttlMinutes * 60 * 1000));

    setTokenCell_(tokensSheet, availableRowIndex, columns.status, 'reserved');
    setTokenCell_(tokensSheet, availableRowIndex, columns.deviceId, deviceId);
    setTokenCell_(tokensSheet, availableRowIndex, columns.userId, userId);
    setTokenCell_(tokensSheet, availableRowIndex, columns.nome, nome);
    setTokenCell_(tokensSheet, availableRowIndex, columns.claimedAt, claimedAt);
    setTokenCell_(tokensSheet, availableRowIndex, columns.reservationExpiresAt, expiresAt);
    setTokenCell_(tokensSheet, availableRowIndex, columns.completedAt, '');
    setTokenCell_(tokensSheet, availableRowIndex, columns.score, '');

    return {
      status: 'success',
      month: monthParam,
      quizId: quizId,
      token: availableToken,
      canPlay: true,
      reason: 'claimed',
      existingScore: null,
      expiresAt: formatDateTime_(expiresAt),
    };
  } finally {
    lock.releaseLock();
  }
}

function getAsyncTokenStats_(ss, monthParam, quizId) {
  const tokensSheet = ss.getSheetByName('TOKENS');
  if (!tokensSheet || tokensSheet.getLastRow() < 2) {
    return {
      month: monthParam,
      quizId: quizId,
      total: 0,
      available: 0,
      reserved: 0,
      completed: 0,
      expired: 0,
    };
  }

  const columns = getTokensColumns_(tokensSheet);
  const rows = tokensSheet.getDataRange().getValues();
  const now = new Date();

  let total = 0;
  let available = 0;
  let reserved = 0;
  let completed = 0;
  let expired = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowQuizId = getTokenValue_(row, columns.quizId);
    const rowMonth = getTokenMonthKey_(row[columns.month]);
    if (rowQuizId !== quizId || rowMonth !== monthParam) continue;

    total += 1;
    const status = normalizeTokenStatus_(row[columns.status]);
    const isExpired = isTokenReservationExpired_(row, columns, now);

    if (status === 'completed') {
      completed += 1;
      continue;
    }

    if (status === 'expired') {
      expired += 1;
      continue;
    }

    if (status === 'reserved') {
      if (isExpired) {
        expired += 1;
      } else {
        reserved += 1;
      }
      continue;
    }

    available += 1;
  }

  return {
    month: monthParam,
    quizId: quizId,
    total: total,
    available: available,
    reserved: reserved,
    completed: completed,
    expired: expired,
  };
}

function saveResultWithToken_(ss, payload) {
  const userId = (payload.userId || '').toString().trim();
  const nome = (payload.nome || '').toString().trim();
  const quizId = (payload.quizId || '').toString().trim();
  const pontuacao = Number(payload.pontuacao || 0);
  const token = (payload.token || '').toString().trim();
  const deviceId = (payload.deviceId || '').toString().trim();
  const monthParam = normalizeMonthParam_(payload.month || getCurrentMonthKey_());

  if (!userId) throw new Error("Campo 'userId' é obrigatório.");
  if (!nome) throw new Error("Campo 'nome' é obrigatório.");
  if (!quizId) throw new Error("Campo 'quizId' é obrigatório.");
  if (!token) throw new Error("Campo 'token' é obrigatório para o quiz mensal.");
  if (!deviceId) throw new Error("Campo 'deviceId' é obrigatório para o quiz mensal.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const now = new Date();
    const resultsSheet = getOrCreateResultsSheet_(ss);
    const tokensSheet = getOrCreateTokensSheet_(ss);
    const columns = getTokensColumns_(tokensSheet);
    const rows = tokensSheet.getDataRange().getValues();

    let tokenRowIndex = -1;
    let tokenRow = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowToken = getTokenValue_(row, columns.token);
      const rowQuizId = getTokenValue_(row, columns.quizId);
      const rowMonth = getTokenMonthKey_(row[columns.month]);
      if (rowToken === token && rowQuizId === quizId && rowMonth === monthParam) {
        tokenRowIndex = i + 1;
        tokenRow = row;
        break;
      }
    }

    if (!tokenRow || tokenRowIndex < 0) {
      return { status: 'error', message: 'Token inválido para o quiz/mês informado.' };
    }

    let status = normalizeTokenStatus_(tokenRow[columns.status]);
    if (isTokenReservationExpired_(tokenRow, columns, now)) {
      expireTokenReservationRow_(tokensSheet, tokenRowIndex, columns);
      status = 'expired';
    }

    const rowDeviceId = getTokenValue_(tokenRow, columns.deviceId);
    if (status === 'completed') {
      const existingScore = Number(columns.score >= 0 ? tokenRow[columns.score] : 0);
      return {
        status: 'success',
        message: 'Tentativa já concluída para este token.',
        strategy: 'already_completed',
        month: monthParam,
        existingScore: isNaN(existingScore) ? 0 : existingScore,
      };
    }

    if (rowDeviceId && rowDeviceId !== deviceId) {
      return {
        status: 'success',
        message: 'Este token já está vinculado a outro dispositivo.',
        strategy: 'already_completed',
        month: monthParam,
        existingScore: null,
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowToken = getTokenValue_(row, columns.token);
      const rowQuizId = getTokenValue_(row, columns.quizId);
      const rowMonth = getTokenMonthKey_(row[columns.month]);
      const rowDevice = getTokenValue_(row, columns.deviceId);
      const rowStatus = normalizeTokenStatus_(row[columns.status]);
      if (rowToken === token) continue;
      if (rowQuizId !== quizId || rowMonth !== monthParam) continue;
      if (rowDevice !== deviceId) continue;
      if (rowStatus === 'completed') {
        const existingScore = Number(columns.score >= 0 ? row[columns.score] : 0);
        return {
          status: 'success',
          message: 'Este dispositivo já concluiu o quiz mensal deste mês.',
          strategy: 'already_completed',
          month: monthParam,
          existingScore: isNaN(existingScore) ? 0 : existingScore,
        };
      }
    }

    if (status !== 'reserved') {
      const expiresAt = new Date(now.getTime() + (90 * 60 * 1000));
      setTokenCell_(tokensSheet, tokenRowIndex, columns.status, 'reserved');
      setTokenCell_(tokensSheet, tokenRowIndex, columns.deviceId, deviceId);
      setTokenCell_(tokensSheet, tokenRowIndex, columns.userId, userId);
      setTokenCell_(tokensSheet, tokenRowIndex, columns.nome, nome);
      setTokenCell_(tokensSheet, tokenRowIndex, columns.claimedAt, now);
      setTokenCell_(tokensSheet, tokenRowIndex, columns.reservationExpiresAt, expiresAt);
    }

    const finalDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    resultsSheet.appendRow([
      now,
      userId,
      nome,
      quizId,
      pontuacao,
      finalDate,
    ]);

    setTokenCell_(tokensSheet, tokenRowIndex, columns.status, 'completed');
    setTokenCell_(tokensSheet, tokenRowIndex, columns.deviceId, deviceId);
    setTokenCell_(tokensSheet, tokenRowIndex, columns.userId, userId);
    setTokenCell_(tokensSheet, tokenRowIndex, columns.nome, nome);
    setTokenCell_(tokensSheet, tokenRowIndex, columns.completedAt, now);
    setTokenCell_(tokensSheet, tokenRowIndex, columns.reservationExpiresAt, '');
    setTokenCell_(tokensSheet, tokenRowIndex, columns.score, pontuacao);

    return {
      status: 'success',
      message: 'Resultado salvo com sucesso.',
      strategy: 'insert',
      month: monthParam,
      token: token,
    };
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const QUIZ_SHEET_NAME = 'quiz_perguntas';
  const QUIZZES_SHEET_NAME = 'QUIZZES';
  
  let response = { status: 'error', message: 'Ação não encontrada' };

  try {
    const sheet = ss.getSheetByName(QUIZ_SHEET_NAME);
    if (!sheet) throw new Error("Aba '" + QUIZ_SHEET_NAME + "' não encontrada na planilha.");

    if (action === 'getQuizzes') {
      const liveQuizzes = getAvailableControlledQuizzes_(ss, 'live', new Date());
      const quizzes = liveQuizzes.map((quiz) => ({ id: quiz.quizId, nome: quiz.titulo || quiz.quizId }));
      response = { status: 'success', quizzes: quizzes, spreadsheetName: ss.getName() };
    }

    if (action === 'getActiveAsyncQuiz') {
      const asyncQuizzes = getAvailableControlledQuizzes_(ss, 'async', new Date());
      if (asyncQuizzes.length === 0) {
        response = { status: 'success', quiz: null, questions: [], spreadsheetName: ss.getName() };
      } else {
        const activeQuiz = asyncQuizzes[0];
        const questionRows = sheet.getDataRange().getValues();
        const questions = buildQuestionsByQuizId_(questionRows, activeQuiz.quizId);
        response = {
          status: 'success',
          quiz: { id: activeQuiz.quizId, nome: activeQuiz.titulo, modo: 'async', ativo: true },
          questions: questions,
          spreadsheetName: ss.getName()
        };
      }
    }

    if (action === 'getAllowedParticipants') {
      const participants = getAllowedParticipants_();
      response = {
        status: 'success',
        participants: participants,
        total: participants.length,
        spreadsheetName: ss.getName(),
      };
    }

    if (action === 'getMonthlyRanking') {
      const monthParam = normalizeMonthParam_(params.month);
      const prize = getAsyncPrizeByMonth_(monthParam);

      const resultsSheet = ss.getSheetByName('RESULTADOS');
      if (!resultsSheet || resultsSheet.getLastRow() < 2) {
        response = { status: 'success', month: monthParam, leaderboard: [], totalPlayers: 0, totalResults: 0, prize: prize, spreadsheetName: ss.getName() };
      } else {
        const monthlyData = buildMonthlyResultsData_(resultsSheet, monthParam);
        response = {
          status: 'success',
          month: monthParam,
          leaderboard: monthlyData.leaderboard,
          totalPlayers: monthlyData.totalPlayers,
          totalResults: monthlyData.totalResults,
          prize: prize,
          spreadsheetName: ss.getName()
        };
      }
    }

    if (action === 'getResultsPanel') {
      const monthParam = normalizeMonthParam_(params.month);
      const requestedLimit = Number(params.limit || 50);
      const limit = Math.max(10, Math.min(200, isNaN(requestedLimit) ? 50 : requestedLimit));
      const prize = getAsyncPrizeByMonth_(monthParam);

      const resultsSheet = ss.getSheetByName('RESULTADOS');
      if (!resultsSheet || resultsSheet.getLastRow() < 2) {
        response = {
          status: 'success',
          month: monthParam,
          leaderboard: [],
          latestResults: [],
          totalPlayers: 0,
          totalResults: 0,
          prize: prize,
          spreadsheetName: ss.getName()
        };
      } else {
        const monthlyData = buildMonthlyResultsData_(resultsSheet, monthParam);
        response = {
          status: 'success',
          month: monthParam,
          leaderboard: monthlyData.leaderboard,
          latestResults: monthlyData.latestResults.slice(0, limit),
          totalPlayers: monthlyData.totalPlayers,
          totalResults: monthlyData.totalResults,
          prize: prize,
          spreadsheetName: ss.getName()
        };
      }
    }

    if (action === 'getAsyncPrize') {
      const monthParam = normalizeMonthParam_(params.month);
      response = {
        status: 'success',
        month: monthParam,
        prize: getAsyncPrizeByMonth_(monthParam),
        spreadsheetName: ss.getName()
      };
    }

    if (action === 'getAsyncTokenStats') {
      const monthParam = normalizeMonthParam_(params.month);
      const quizId = (params.quizId || '').toString().trim();
      if (!quizId) throw new Error("Parâmetro 'quizId' é obrigatório.");

      const stats = getAsyncTokenStats_(ss, monthParam, quizId);
      response = {
        status: 'success',
        month: stats.month,
        quizId: stats.quizId,
        total: stats.total,
        available: stats.available,
        reserved: stats.reserved,
        completed: stats.completed,
        expired: stats.expired,
        spreadsheetName: ss.getName()
      };
    }

    if (action === 'getAsyncEligibility') {
      const monthParam = normalizeMonthParam_(params.month);
      const userId = (params.userId || '').toString().trim();
      const quizId = (params.quizId || '').toString().trim();
      if (!userId) throw new Error("Parâmetro 'userId' é obrigatório.");
      if (!quizId) throw new Error("Parâmetro 'quizId' é obrigatório.");

      const resultsSheet = ss.getSheetByName('RESULTADOS');
      if (!resultsSheet || resultsSheet.getLastRow() < 2) {
        response = {
          status: 'success',
          month: monthParam,
          canPlay: true,
          reason: 'available',
          existingScore: null,
          spreadsheetName: ss.getName()
        };
      } else {
        const columns = getResultsColumns_(resultsSheet);
        const existing = findExistingMonthlyResult_(resultsSheet, columns, userId, quizId, monthParam);
        const canPlay = !existing;
        response = {
          status: 'success',
          month: monthParam,
          canPlay: canPlay,
          reason: canPlay ? 'available' : 'already_completed',
          existingScore: existing ? existing.score : null,
          spreadsheetName: ss.getName()
        };
      }
    }

    if (action === 'createGameSession') {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const targetQuizId = params.quizId;
      const data = sheet.getDataRange().getValues();
      const questions = buildQuestionsByQuizId_(data, targetQuizId);

      if (questions.length === 0) throw new Error("Nenhuma pergunta válida encontrada para o quiz: " + targetQuizId);

      const hostId = "host_" + Date.now();
      const state = {
        pin: pin,
        hostId: hostId,
        status: 'LOBBY',
        perguntas: questions,
        currentQuestionIndex: 0,
        players: {},
        tempoPorPergunta: parseInt(params.tempoPorPergunta || 20),
        modoDeJogo: params.modoDeJogo || 'automatico',
        questionStartTime: 0,
        answers: {},
        lastAnswers: {},
        lastCorrectAnswer: -1,
        leaderboard: []
      };

      props.setProperty('game_' + pin, JSON.stringify(state));
      response = { status: 'success', pin: pin, hostId: hostId };
    }

    if (action === 'getGameState') {
      const pin = params.pin;
      const raw = props.getProperty('game_' + pin);
      response = { status: 'success', gameState: JSON.parse(raw) };
    }

    if (action === 'joinGame') {
      const pin = params.pin;
      const name = params.nome;
      let state = JSON.parse(props.getProperty('game_' + pin));
      if (!state.players[name]) {
        state.players[name] = { id: name, nome: name, avatar: params.avatar, score: 0, correctCount: 0 };
        props.setProperty('game_' + pin, JSON.stringify(state));
      }
      response = { status: 'success', gameState: state, playerId: name };
    }

    if (action === 'startGame') {
      let state = JSON.parse(props.getProperty('game_' + params.pin));
      state.status = 'QUESTION';
      state.questionStartTime = Date.now();
      props.setProperty('game_' + params.pin, JSON.stringify(state));
      response = { status: 'success' };
    }

    if (action === 'submitAnswer') {
      let state = JSON.parse(props.getProperty('game_' + params.pin));
      const q = state.perguntas[state.currentQuestionIndex];
      const isCorrect = parseInt(params.respostaIdx) === q.corretaIdx;
      const elapsed = (Date.now() - state.questionStartTime) / 1000;
      const tempoNormalizado = state.tempoPorPergunta > 0 ? (elapsed / state.tempoPorPergunta) : 1;
      const points = calculateScore({ correta: isCorrect, tempo: tempoNormalizado });

      state.players[params.nome].score += points;
      if (isCorrect) {
        state.players[params.nome].correctCount += 1;
      }
      state.answers[params.nome] = { respostaIdx: parseInt(params.respostaIdx), points: points };
      props.setProperty('game_' + params.pin, JSON.stringify(state));
      response = { status: 'success' };
    }

    if (action === 'nextGameState') {
      let state = JSON.parse(props.getProperty('game_' + params.pin));
      if (state.status === 'QUESTION') {
        state.status = 'ANSWER_REVEAL';
        state.lastCorrectAnswer = state.perguntas[state.currentQuestionIndex].corretaIdx;
        state.lastAnswers = state.answers;
        state.leaderboard = Object.values(state.players).sort((a,b) => b.score - a.score);
      } else if (state.status === 'ANSWER_REVEAL') {
        state.status = 'LEADERBOARD';
      } else if (state.status === 'LEADERBOARD') {
        if (state.currentQuestionIndex < state.perguntas.length - 1) {
          state.currentQuestionIndex++;
          state.status = 'QUESTION';
          state.questionStartTime = Date.now();
          state.answers = {};
        } else { state.status = 'FINAL'; }
      }
      props.setProperty('game_' + params.pin, JSON.stringify(state));
      response = { status: 'success' };
    }
  } catch (err) { response = { status: 'error', message: err.toString() }; }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let response = { status: 'error', message: 'Ação não encontrada' };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(rawBody || '{}');
    const action = payload.action;

    if (action === 'saveAsyncPrize') {
      const month = normalizeMonthParam_(payload.month);
      const title = (payload.title || '').toString().trim() || ('Prêmio do mês ' + month);
      const sourceUrl = (payload.sourceUrl || payload.imageUrl || '').toString().trim();
      const imageUrl = normalizePrizeImageUrl_(payload.imageUrl || sourceUrl);
      const updatedAt = formatDateTime_(new Date());

      if (!imageUrl) throw new Error("Campo 'imageUrl' é obrigatório.");

      const prizesMap = getAsyncPrizesMap_();
      prizesMap[month] = {
        title: title,
        imageUrl: imageUrl,
        sourceUrl: sourceUrl,
        updatedAt: updatedAt,
      };
      setAsyncPrizesMap_(prizesMap);

      response = {
        status: 'success',
        message: 'Prêmio mensal salvo com sucesso.',
        prize: getAsyncPrizeByMonth_(month),
      };
    }

    if (action === 'generateAsyncTokens') {
      const quizId = (payload.quizId || '').toString().trim();
      const month = normalizeMonthParam_(payload.month || getCurrentMonthKey_());
      const quantity = Number(payload.quantity || 0);

      if (!quizId) throw new Error("Campo 'quizId' é obrigatório.");
      if (!quantity || isNaN(quantity) || quantity < 1 || quantity > 5000) {
        throw new Error("Campo 'quantity' deve ser um número entre 1 e 5000.");
      }

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        const tokensSheet = getOrCreateTokensSheet_(ss);
        const columns = getTokensColumns_(tokensSheet);
        const rows = tokensSheet.getDataRange().getValues();
        const usedTokens = {};

        for (let i = 1; i < rows.length; i++) {
          const tokenValue = getTokenValue_(rows[i], columns.token);
          if (tokenValue) usedTokens[tokenValue] = true;
        }

        const colSize = tokensSheet.getLastColumn();
        const now = new Date();
        const newRows = [];

        for (let i = 0; i < quantity; i++) {
          const row = createEmptyRow_(colSize);
          row[columns.token] = generateTokenCode_(usedTokens);
          row[columns.quizId] = quizId;
          row[columns.month] = month;
          row[columns.status] = 'available';
          if (columns.createdAt >= 0) row[columns.createdAt] = now;
          newRows.push(row);
        }

        const startRow = tokensSheet.getLastRow() + 1;
        tokensSheet.getRange(startRow, 1, newRows.length, colSize).setValues(newRows);
      } finally {
        lock.releaseLock();
      }

      const stats = getAsyncTokenStats_(ss, month, quizId);
      response = {
        status: 'success',
        message: quantity + ' tokens gerados com sucesso.',
        month: month,
        quizId: quizId,
        generated: quantity,
        total: stats.total,
        available: stats.available,
        reserved: stats.reserved,
        completed: stats.completed,
        expired: stats.expired,
      };
    }

    if (action === 'claimAsyncToken') {
      response = claimAsyncToken_(ss, payload);
    }

    if (action === 'saveResult') {
      const token = (payload.token || '').toString().trim();
      if (token) {
        response = saveResultWithToken_(ss, payload);
        return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
      }

      const userId = (payload.userId || '').toString().trim();
      const nome = (payload.nome || '').toString().trim();
      const quizId = (payload.quizId || '').toString().trim();
      const pontuacao = Number(payload.pontuacao || 0);

      if (!userId) throw new Error("Campo 'userId' é obrigatório.");
      if (!nome) throw new Error("Campo 'nome' é obrigatório.");
      if (!quizId) throw new Error("Campo 'quizId' é obrigatório.");

      const resultsSheet = getOrCreateResultsSheet_(ss);
      const columns = getResultsColumns_(resultsSheet);
      const today = new Date();
      const finalDate = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const finalDateObj = resolveResultDate_(finalDate);
      const targetMonth = monthKey_(finalDateObj);
      const existing = findExistingMonthlyResult_(resultsSheet, columns, userId, quizId, targetMonth);

      if (!existing) {
        resultsSheet.appendRow([
          today,
          userId,
          nome,
          quizId,
          pontuacao,
          finalDate,
        ]);
        response = { status: 'success', message: 'Resultado salvo com sucesso.', strategy: 'insert', month: targetMonth };
      } else {
        response = {
          status: 'success',
          message: 'Tentativa já registrada para este mês. Resultado não alterado.',
          strategy: 'already_completed',
          month: targetMonth,
          existingScore: existing.score,
        };
      }
    }
  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
