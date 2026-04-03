import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tag } from '../components/ui/Tag';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { QuestionCard } from '../components/game/QuestionCard';
import { QuestionOptionsGrid } from '../components/game/QuestionOptionsGrid';
import { GameTimer } from '../components/game/GameTimer';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { quizService } from '../services/quizService';
import { useGameStore } from '../store/gameStore';
import { AsyncQuiz } from '../types/asyncQuiz';
import { getOrCreateDeviceId } from '../utils/deviceIdentity';

const ASYNC_PROGRESS_KEY = 'eac_async_progress';
const ASYNC_RESULT_KEY = 'eac_async_result';
const ASYNC_QUESTION_DURATION_SECONDS = 30;
const PARTICIPANT_REGISTRATION_URL = 'https://forms.gle/t9HuaTRoBH8ssAez9';

interface AsyncProgress {
  quizId: string;
  token: string;
  tokenMonth: string;
  userId: string;
  currentIndex: number;
  answers: number[];
  tempos: number[];
  startedAt: number;
}

const buildInitialProgress = (size: number, quizId: string): AsyncProgress => ({
  quizId,
  token: '',
  tokenMonth: '',
  userId: '',
  currentIndex: 0,
  answers: Array(size).fill(-1),
  tempos: Array(size).fill(1),
  startedAt: Date.now(),
});

const normalizeParticipantKey = (value: string) =>
  (typeof value.normalize === 'function' ? value.normalize('NFD') : value)
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const parseProgress = (raw: string | null, size: number, quizId: string): AsyncProgress => {
  if (!raw) return buildInitialProgress(size, quizId);

  try {
    const parsed = JSON.parse(raw) as AsyncProgress;
    if (!Array.isArray(parsed.answers)) return buildInitialProgress(size, quizId);
    if (typeof parsed.currentIndex !== 'number') return buildInitialProgress(size, quizId);
    if (parsed.quizId !== quizId) return buildInitialProgress(size, quizId);

    const normalizedAnswers = Array(size).fill(-1).map((_, idx) => {
      const answer = parsed.answers[idx];
      return typeof answer === 'number' ? answer : -1;
    });
    const parsedTempos = Array.isArray((parsed as any).tempos) ? (parsed as any).tempos : [];
    const normalizedTempos = Array(size).fill(1).map((_, idx) => {
      const tempo = parsedTempos[idx];
      if (typeof tempo !== 'number') return 1;
      return Math.max(0, Math.min(1, tempo));
    });
    const maxIndex = Math.max(size - 1, 0);

    return {
      quizId,
      token: typeof (parsed as any).token === 'string' ? (parsed as any).token : '',
      tokenMonth: typeof (parsed as any).tokenMonth === 'string' ? (parsed as any).tokenMonth : '',
      userId: typeof (parsed as any).userId === 'string' ? (parsed as any).userId : '',
      currentIndex: Math.min(Math.max(parsed.currentIndex, 0), maxIndex),
      answers: normalizedAnswers,
      tempos: normalizedTempos,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
    };
  } catch {
    return buildInitialProgress(size, quizId);
  }
};

export const AsyncQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { userName, setUserIdentityByName, apiUrl } = useGameStore();
  const deviceId = getOrCreateDeviceId();

  const [quiz, setQuiz] = useState<AsyncQuiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadingNames, setLoadingNames] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [displayName, setDisplayName] = useState(userName);
  const [allowedNames, setAllowedNames] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [formError, setFormError] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [progress, setProgress] = useState<AsyncProgress | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState('');

  const loadActiveQuiz = useCallback(async () => {
    if (!apiUrl) {
      setLoadError('URL da API não configurada. Vá em Configurações.');
      setLoadingQuiz(false);
      setLoadingNames(false);
      return;
    }

    setLoadingQuiz(true);
    setLoadingNames(true);
    setLoadError('');

    try {
      const [activeQuiz, participants] = await Promise.all([
        quizService.getActiveAsyncQuiz(apiUrl),
        quizService.getAllowedParticipants(apiUrl),
      ]);
      setAllowedNames(participants);

      if (!participants.length) {
        setQuiz(null);
        setProgress(null);
        setStarted(false);
        setQuestionStartTime(0);
        setLoadError('A lista de nomes autorizados está vazia. Verifique as planilhas de encontristas/encontreiros.');
        return;
      }

      if (!activeQuiz) {
        setQuiz(null);
        setProgress(null);
        setStarted(false);
        setQuestionStartTime(0);
        setLoadError('Nenhum quiz ativo com modo "async" e ativo=true foi encontrado na aba QUIZZES.');
        return;
      }

      if (activeQuiz.perguntas.length === 0) {
        setQuiz(null);
        setProgress(null);
        setStarted(false);
        setQuestionStartTime(0);
        setLoadError(`O quiz ativo "${activeQuiz.nome}" não possui perguntas válidas em quiz_perguntas.`);
        return;
      }

      const raw = localStorage.getItem(ASYNC_PROGRESS_KEY);
      const parsed = parseProgress(raw, activeQuiz.perguntas.length, activeQuiz.id);
      console.log("Quiz carregado:", activeQuiz.id);
      setQuiz(activeQuiz);
      setProgress(parsed);
    } catch (err: any) {
      setQuiz(null);
      setProgress(null);
      setAllowedNames([]);
      setStarted(false);
      setQuestionStartTime(0);
      setLoadError(err?.message || 'Falha ao carregar quiz ativo.');
    } finally {
      setLoadingQuiz(false);
      setLoadingNames(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadActiveQuiz();
  }, [loadActiveQuiz]);

  const persistProgress = useCallback((next: AsyncProgress) => {
    localStorage.setItem(ASYNC_PROGRESS_KEY, JSON.stringify(next));
    setProgress(next);
  }, []);

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const allowedNamesByKey = useMemo(() => {
    const map = new Map<string, string>();
    allowedNames.forEach((name) => {
      const key = normalizeParticipantKey(name);
      if (key && !map.has(key)) {
        map.set(key, name);
      }
    });
    return map;
  }, [allowedNames]);

  const submitAsyncAnswer = useCallback(async (answerIdx: number) => {
    if (!quiz || !progress || isSubmittingAnswer) return;

    const selectedIndex = progress.answers[progress.currentIndex];
    if (selectedIndex !== -1) return;

    setIsSubmittingAnswer(true);

    const normalizedAnswer = answerIdx >= 0 ? answerIdx : -1;
    const elapsedMs = questionStartTime > 0 ? Math.max(0, Date.now() - questionStartTime) : ASYNC_QUESTION_DURATION_SECONDS * 1000;
    const tempoNormalizado = Math.max(0, Math.min(1, elapsedMs / (ASYNC_QUESTION_DURATION_SECONDS * 1000)));

    const nextAnswers = [...progress.answers];
    const nextTempos = [...progress.tempos];
    nextAnswers[progress.currentIndex] = normalizedAnswer;
    nextTempos[progress.currentIndex] = tempoNormalizado;

    try {
      const markedProgress = {
        ...progress,
        answers: nextAnswers,
        tempos: nextTempos,
      };
      persistProgress(markedProgress);
      setAnswerFeedback('Resposta registrada.');

      const isLastQuestion = progress.currentIndex >= quiz.perguntas.length - 1;
      if (isLastQuestion) {
        const result = quizService.evaluateAsyncAnswers(quiz.perguntas, nextAnswers, nextTempos);
        const nome = displayName.trim() || userName || 'Participante';
      const data = getTodayDate();
      let registrationStatus: 'saved' | 'already_completed' | 'queued' = 'saved';
      let registrationMessage = '';

      try {
        const saveResponse: any = await quizService.saveResult(apiUrl, {
            userId: markedProgress.userId || '',
            nome,
          quizId: quiz.id,
          pontuacao: result.pontuacao,
          data,
          token: markedProgress.token || '',
          deviceId,
          month: markedProgress.tokenMonth || '',
        });

          if (saveResponse?.strategy === 'already_completed') {
            registrationStatus = 'already_completed';
            registrationMessage = saveResponse?.message || '';
          } else if (saveResponse?.status === 'queued') {
            registrationStatus = 'queued';
            registrationMessage = saveResponse?.message || '';
          }
        } catch (err) {
          console.error('Falha ao salvar resultado async no Apps Script:', err);
          registrationStatus = 'queued';
          registrationMessage = 'Falha na conexão. Resultado será reenviado automaticamente.';
        }

        localStorage.setItem(ASYNC_RESULT_KEY, JSON.stringify({
          ...result,
          quizId: quiz.id,
          quizNome: quiz.nome,
          data,
          registrationStatus,
          registrationMessage,
        }));
        localStorage.removeItem(ASYNC_PROGRESS_KEY);
        navigate('/resultado');
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 450));
      setAnswerFeedback('');

      persistProgress({
        ...markedProgress,
        currentIndex: progress.currentIndex + 1,
      });
    } finally {
      setIsSubmittingAnswer(false);
    }
  }, [apiUrl, deviceId, displayName, isSubmittingAnswer, navigate, persistProgress, progress, questionStartTime, quiz, userName]);

  useEffect(() => {
    if (!started || !quiz || !progress) {
      setQuestionStartTime(0);
      return;
    }
    setQuestionStartTime(Date.now());
    setAnswerFeedback('');
  }, [started, quiz?.id, progress?.currentIndex]);

  const { timeLeft, isUrgent } = useQuestionTimer(
    questionStartTime,
    ASYNC_QUESTION_DURATION_SECONDS,
    () => {
      if (!started) return;
      void submitAsyncAnswer(-1);
    }
  );

  const handleStart = async () => {
    if (!quiz || !progress) return;

    if (loadingNames || allowedNames.length === 0) {
      setFormError('A lista de nomes ainda não foi carregada. Tente novamente em alguns segundos.');
      return;
    }

    const normalizedKey = normalizeParticipantKey(displayName);
    if (!normalizedKey) {
      setFormError('Pesquise e selecione seu nome na lista para iniciar.');
      return;
    }

    const matchedName = allowedNamesByKey.get(normalizedKey);
    if (!matchedName) {
      setFormError('Nome não encontrado na lista. Use o link de cadastro e tente novamente.');
      return;
    }

    setFormError('');
    setStartLoading(true);
    try {
      setDisplayName(matchedName);
      const resolvedUserId = setUserIdentityByName(matchedName);
      const claim = await quizService.claimAsyncToken(apiUrl, {
        userId: resolvedUserId,
        nome: matchedName,
        quizId: quiz.id,
        deviceId,
      });

      if (!claim.canPlay) {
        const scoreInfo = claim.existingScore !== null
          ? ` Pontuação registrada: ${claim.existingScore}.`
          : '';
        if (claim.reason === 'sold_out') {
          setFormError('Todos os acessos do quiz mensal já foram utilizados. Tente novamente mais tarde.');
          return;
        }
        if (claim.reason === 'already_reserved') {
          setFormError(`Este dispositivo já está com uma tentativa em andamento em ${claim.month}. Conclua o quiz para validar sua participação.`);
          return;
        }
        if (claim.reason === 'already_claimed') {
          setFormError(`Este dispositivo já utilizou a tentativa de ${claim.month}. Nova participação será liberada no próximo mês.`);
          return;
        }
        setFormError(`Este dispositivo já concluiu o quiz em ${claim.month}.${scoreInfo} Nova participação será liberada no próximo mês.`);
        return;
      }

      if (!claim.token) {
        setFormError('Não foi possível reservar um acesso para este dispositivo.');
        return;
      }

      persistProgress({
        ...progress,
        token: claim.token,
        tokenMonth: claim.month,
        userId: resolvedUserId,
      });

      setStarted(true);
      setQuestionStartTime(Date.now());
    } catch (err: any) {
      setFormError(err?.message || 'Não foi possível validar sua elegibilidade.');
    } finally {
      setStartLoading(false);
    }
  };

  const handleRestart = () => {
    if (!quiz) return;
    const reset = buildInitialProgress(quiz.perguntas.length, quiz.id);
    localStorage.removeItem(ASYNC_RESULT_KEY);
    persistProgress(reset);
    setStarted(false);
    setQuestionStartTime(0);
    setAnswerFeedback('');
  };

  const handleSelect = (answerIdx: number) => {
    void submitAsyncAnswer(answerIdx);
  };

  if (loadingQuiz) {
    return (
      <div className="max-w-lg mx-auto animate-in fade-in duration-300">
        <Card className="text-center p-10">
          <LoadingSpinner label="Carregando quiz async ativo..." />
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto animate-in fade-in duration-300">
        <Card className="text-center p-10 border-red-500/40">
          <Tag color="green">Modo Async</Tag>
          <p className="text-red-300 mt-4 mb-6">{loadError}</p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
              Voltar
            </Button>
            <Button fullWidth onClick={loadActiveQuiz}>
              Tentar Novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!quiz || !progress) return null;

  const currentQuestion = quiz.perguntas[progress.currentIndex];
  const selectedIndex = progress.answers[progress.currentIndex];

  if (!started) {
    return (
      <div className="max-w-lg mx-auto animate-in fade-in duration-500">
        <Card>
          <div className="text-center mb-6">
            <Tag color="green">Modo Async</Tag>
            <h2 className="text-3xl font-bold mt-4">Quiz Contínuo</h2>
            <p className="text-white/60 mt-2">{quiz.nome}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seu Nome</label>
              <input
                type="text"
                list="allowed-participants-list"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={loadingNames ? 'Carregando nomes...' : 'Digite para pesquisar seu nome'}
                disabled={loadingNames}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <datalist id="allowed-participants-list">
                {allowedNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="text-xs text-white/55 mt-2">
                Pesquise e selecione exatamente o seu nome para validar sua participação.
              </p>
              {!loadingNames && (
                <p className="text-[11px] text-white/40 mt-1">
                  {allowedNames.length} nomes disponíveis.
                </p>
              )}
              <p className="text-xs text-white/55 mt-2">
                Não encontrou seu nome?{' '}
                <a
                  href={PARTICIPANT_REGISTRATION_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                >
                  Faça seu cadastro aqui
                </a>
                {' '}e volte para responder o quiz.
              </p>
            </div>

            <div className="text-sm text-white/60">
              <p>Perguntas: {quiz.perguntas.length}</p>
              <p>Ranking: separado do modo ao vivo</p>
            </div>

            {formError && (
              <p className="text-red-400 text-sm text-center font-medium bg-red-500/10 p-2 rounded-lg">
                {formError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
                Voltar
              </Button>
              <Button fullWidth onClick={() => void handleStart()} disabled={startLoading || loadingNames || allowedNames.length === 0}>
                {startLoading ? 'Validando...' : 'Iniciar'}
              </Button>
            </div>

            <Button variant="outline" fullWidth onClick={handleRestart}>
              Reiniciar progresso async
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag color="green">Modo Async</Tag>
          <GameTimer timeLeft={timeLeft} isUrgent={isUrgent} />
        </div>
        <Tag color="blue">
          Progresso: {progress.currentIndex + 1}/{quiz.perguntas.length}
        </Tag>
      </div>

      <QuestionCard
        text={currentQuestion.pergunta}
        index={progress.currentIndex}
        total={quiz.perguntas.length}
      />

      <QuestionOptionsGrid
        options={currentQuestion.opcoes}
        onSelect={handleSelect}
        selectedIndex={selectedIndex}
        disabled={selectedIndex !== -1 || isSubmittingAnswer}
      />

      {answerFeedback && (
        <Card className="p-4 text-center border-green-400/30">
          <p className="text-green-300 text-sm font-medium">{answerFeedback}</p>
        </Card>
      )}
    </div>
  );
};
