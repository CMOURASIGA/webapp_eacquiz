import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tag } from '../components/ui/Tag';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AsyncQuizResult } from '../types/asyncQuiz';
import { useGameStore } from '../store/gameStore';
import { quizService } from '../services/quizService';
import { LeaderboardEntry } from '../types/game';
import { LeaderboardTable } from '../components/game/LeaderboardTable';
import { AsyncPrize } from '../types/asyncQuiz';

const ASYNC_RESULT_KEY = 'eac_async_result';
const ASYNC_PROGRESS_KEY = 'eac_async_progress';

const readResult = (): AsyncQuizResult | null => {
  const raw = localStorage.getItem(ASYNC_RESULT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AsyncQuizResult;
    if (typeof parsed.total !== 'number') return null;
    if (typeof parsed.acertos !== 'number') return null;
    if (typeof parsed.pontuacao !== 'number') return null;
    if (typeof parsed.respondidas !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const getDynamicMessage = (position: number | null, score: number): string => {
  if (position === 1) return 'Você está em 1º lugar no mês. Mantenha a liderança!';
  if (position !== null && position <= 3) return 'Top 3 do mês. Falta pouco para o topo!';
  if (position !== null && position <= 10) return 'Você está no Top 10 mensal. Continue jogando para subir.';
  if (score >= 3500) return 'Excelente pontuação. Mais uma rodada pode te colocar no topo.';
  if (score >= 2000) return 'Bom resultado. Continue praticando para avançar no ranking.';
  return 'Você já começou sua jornada no ranking. Tente novamente para melhorar.';
};

export const AsyncResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { apiUrl, userId } = useGameStore();
  const result = useMemo(() => readResult(), []);
  const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
  const [rankingMonth, setRankingMonth] = useState('');
  const [prize, setPrize] = useState<AsyncPrize | null>(null);
  const [rankingPlayers, setRankingPlayers] = useState(0);
  const [rankingResults, setRankingResults] = useState(0);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingError, setRankingError] = useState('');

  useEffect(() => {
    const loadRanking = async () => {
      if (!apiUrl) {
        setRankingError('URL da API não configurada.');
        setRankingLoading(false);
        return;
      }

      setRankingLoading(true);
      setRankingError('');

      try {
        const data = await quizService.getResultsPanel(apiUrl, undefined, 100);
        setRanking(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        setRankingMonth(data.month || '');
        setPrize(data.prize);
        setRankingPlayers(Number(data.totalPlayers || 0));
        setRankingResults(Number(data.totalResults || 0));
      } catch (err: any) {
        setRankingError(err?.message || 'Não foi possível carregar o ranking mensal.');
      } finally {
        setRankingLoading(false);
      }
    };

    loadRanking();
  }, [apiUrl]);

  const handleTryAgain = () => {
    localStorage.removeItem(ASYNC_PROGRESS_KEY);
    localStorage.removeItem(ASYNC_RESULT_KEY);
    navigate('/quiz');
  };

  const myRankingPosition = useMemo(() => {
    if (!ranking.length) return null;
    const idx = ranking.findIndex((entry) => entry.playerId === userId);
    if (idx < 0) return null;
    return idx + 1;
  }, [ranking, userId]);

  const dynamicMessage = useMemo(() => {
    if (!result) return '';
    return getDynamicMessage(myRankingPosition, result.pontuacao);
  }, [myRankingPosition, result]);

  const registrationNotice = useMemo(() => {
    if (!result?.registrationStatus) return '';
    if (result.registrationStatus === 'already_completed') {
      return result.registrationMessage || 'Seu resultado não foi contabilizado porque sua tentativa deste mês já havia sido registrada.';
    }
    if (result.registrationStatus === 'queued') {
      return result.registrationMessage || 'Seu resultado foi salvo localmente e será reenviado quando a conexão voltar.';
    }
    return '';
  }, [result]);

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
        <Card className="text-center">
          <Tag color="green">Modo Async</Tag>
          <h2 className="text-2xl font-bold mt-4">Nenhum resultado encontrado</h2>
          <p className="text-white/60 mt-2 mb-6">Finalize um quiz contínuo para ver seu resultado.</p>
          <Button fullWidth onClick={() => navigate('/quiz')}>
            Ir para Quiz
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-300 space-y-6">
      <Card className="text-center">
        <Tag color="green">Modo Async</Tag>
        <h2 className="text-3xl font-bold mt-4">Resultado Final</h2>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest opacity-60">Pontuação</p>
            <p className="text-2xl font-black text-green-400">{result.pontuacao}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest opacity-60">Posição</p>
            <p className="text-2xl font-black text-blue-400">
              {myRankingPosition ? `#${myRankingPosition}` : '—'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest opacity-60">Acertos</p>
            <p className="text-2xl font-black text-white">{result.acertos}/{result.total}</p>
          </Card>
        </div>

        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-100">{dynamicMessage}</p>
        </div>

        {registrationNotice && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm text-amber-100">{registrationNotice}</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
            Início
          </Button>
          <Button fullWidth onClick={handleTryAgain}>
            Jogar novamente
          </Button>
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Ranking Mensal</h3>
          <div className="flex items-center gap-2">
            {rankingMonth && <Tag color="blue">{rankingMonth}</Tag>}
            {!rankingLoading && !rankingError && (
              <Tag color="green">{rankingPlayers} jogadores • {rankingResults} resultados</Tag>
            )}
          </div>
        </div>

        {rankingLoading && (
          <Card className="text-center p-6">
            <LoadingSpinner label="Carregando ranking..." size="sm" />
          </Card>
        )}

        {!rankingLoading && rankingError && (
          <Card className="text-center p-6 border-red-500/40">
            <p className="text-red-300">{rankingError}</p>
          </Card>
        )}

        {!rankingLoading && !rankingError && ranking.length === 0 && (
          <Card className="text-center p-6">
            <p className="text-white/60">Ainda não há resultados para este mês.</p>
          </Card>
        )}

        {!rankingLoading && !rankingError && ranking.length > 0 && (
          <LeaderboardTable entries={ranking} highlightId={userId} />
        )}
      </div>

      {!rankingLoading && !rankingError && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold">Prêmio do Mês</h3>
            {rankingMonth && <Tag color="green">{rankingMonth}</Tag>}
          </div>

          {prize?.imageUrl ? (
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 items-center">
              <img
                src={prize.imageUrl}
                alt={prize.title || 'Prêmio do mês'}
                className="w-full h-44 object-contain rounded-xl bg-black/20"
              />
              <div>
                <p className="text-lg font-bold">{prize.title || 'Prêmio mensal'}</p>
                {prize.sourceUrl && (
                  <a className="text-blue-300 text-sm underline break-all" href={prize.sourceUrl} target="_blank" rel="noreferrer">
                    Ver fonte da imagem
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-white/60">O prêmio deste mês ainda não foi divulgado.</p>
          )}
        </Card>
      )}
    </div>
  );
};
