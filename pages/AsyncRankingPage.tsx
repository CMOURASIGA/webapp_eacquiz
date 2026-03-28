import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tag } from '../components/ui/Tag';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LeaderboardTable } from '../components/game/LeaderboardTable';
import { useGameStore } from '../store/gameStore';
import { quizService } from '../services/quizService';
import { LeaderboardEntry } from '../types/game';
import { AsyncPrize } from '../types/asyncQuiz';

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const AsyncRankingPage: React.FC = () => {
  const navigate = useNavigate();
  const { apiUrl, userId } = useGameStore();

  const [month, setMonth] = useState(getCurrentMonth());
  const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
  const [prize, setPrize] = useState<AsyncPrize | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRanking = async () => {
      if (!apiUrl) {
        setError('URL da API não configurada.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await quizService.getResultsPanel(apiUrl, month, 100);
        setRanking(data.leaderboard);
        setPrize(data.prize);
        setTotalPlayers(data.totalPlayers);
        setTotalResults(data.totalResults);
      } catch (err: any) {
        setError(err?.message || 'Falha ao carregar ranking mensal.');
      } finally {
        setLoading(false);
      }
    };

    void loadRanking();
  }, [apiUrl, month]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <Tag color="green">Modo Async</Tag>
            <h2 className="text-3xl font-bold mt-3">Ranking Mensal</h2>
            <p className="text-white/60 mt-2">Classificação atual de jogadores do quiz mensal.</p>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Mês</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Início
            </Button>
            <Button onClick={() => navigate('/quiz')}>
              Jogar
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Jogadores no mês</p>
          <p className="text-2xl font-black text-green-300">{totalPlayers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Resultados no mês</p>
          <p className="text-2xl font-black text-white">{totalResults}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Prêmio do Mês</h3>
          <Tag color="green">{month}</Tag>
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

      {loading && (
        <Card className="text-center p-8">
          <LoadingSpinner label="Carregando ranking..." />
        </Card>
      )}

      {!loading && error && (
        <Card className="text-center p-8 border-red-500/40">
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {!loading && !error && ranking.length === 0 && (
        <Card className="text-center p-8">
          <p className="text-white/60">Ainda não há resultados no mês selecionado.</p>
        </Card>
      )}

      {!loading && !error && ranking.length > 0 && (
        <LeaderboardTable entries={ranking} highlightId={userId} />
      )}
    </div>
  );
};
