import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tag } from '../components/ui/Tag';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LeaderboardTable } from '../components/game/LeaderboardTable';
import { useGameStore } from '../store/gameStore';
import { quizService, ResultRow, AsyncTokenStats } from '../services/quizService';
import { LeaderboardEntry } from '../types/game';
import { AsyncPrize } from '../types/asyncQuiz';
import { normalizePrizeImageUrl } from '../utils/prize';

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const AdminResultsPanelPage: React.FC = () => {
  const navigate = useNavigate();
  const { apiUrl } = useGameStore();

  const [month, setMonth] = useState(getCurrentMonth());
  const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
  const [latestResults, setLatestResults] = useState<ResultRow[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [prize, setPrize] = useState<AsyncPrize | null>(null);
  const [prizeTitle, setPrizeTitle] = useState('');
  const [prizeImageInput, setPrizeImageInput] = useState('');
  const [prizeSaving, setPrizeSaving] = useState(false);
  const [prizeMessage, setPrizeMessage] = useState('');
  const [tokenQuizId, setTokenQuizId] = useState('');
  const [tokenQuantity, setTokenQuantity] = useState(1000);
  const [tokenStats, setTokenStats] = useState<AsyncTokenStats>({
    month: month,
    quizId: '',
    total: 0,
    available: 0,
    reserved: 0,
    completed: 0,
    expired: 0,
  });
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenGenerating, setTokenGenerating] = useState(false);
  const [tokenMessage, setTokenMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async () => {
    if (!apiUrl) {
      setError('URL da API não configurada. Verifique em Configurações.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await quizService.getResultsPanel(apiUrl, month, 50);
      setRanking(data.leaderboard);
      setLatestResults(data.latestResults);
      setTotalPlayers(data.totalPlayers);
      setTotalResults(data.totalResults);
      setPrize(data.prize);
      setPrizeTitle(data?.prize?.title || '');
      setPrizeImageInput(data?.prize?.sourceUrl || data?.prize?.imageUrl || '');

      if (!tokenQuizId) {
        let fallbackQuizId = '';
        if (data.latestResults?.length) fallbackQuizId = data.latestResults[0].quizId || '';
        if (!fallbackQuizId) {
          const activeAsyncQuiz = await quizService.getActiveAsyncQuiz(apiUrl);
          fallbackQuizId = activeAsyncQuiz?.id || '';
        }
        if (fallbackQuizId) setTokenQuizId(fallbackQuizId);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados de RESULTADOS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, [apiUrl, month]);

  const loadTokenStats = async () => {
    if (!apiUrl || !tokenQuizId) return;

    setTokenLoading(true);
    try {
      const stats = await quizService.getAsyncTokenStats(apiUrl, { month, quizId: tokenQuizId });
      setTokenStats(stats);
    } catch (err: any) {
      setTokenMessage(err?.message || 'Falha ao carregar status dos tokens.');
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    if (!tokenQuizId) return;
    void loadTokenStats();
  }, [apiUrl, month, tokenQuizId]);

  const monthTag = useMemo(() => month, [month]);
  const normalizedPrizePreviewUrl = useMemo(() => normalizePrizeImageUrl(prizeImageInput), [prizeImageInput]);

  const handleGenerateTokens = async () => {
    if (!apiUrl) {
      setTokenMessage('URL da API não configurada.');
      return;
    }
    if (!tokenQuizId.trim()) {
      setTokenMessage('Informe o quizId para geração de tokens.');
      return;
    }

    const quantity = Number(tokenQuantity);
    if (!quantity || Number.isNaN(quantity) || quantity < 1 || quantity > 5000) {
      setTokenMessage('Quantidade deve ser entre 1 e 5000.');
      return;
    }

    setTokenGenerating(true);
    setTokenMessage('');
    try {
      const data: any = await quizService.generateAsyncTokens(apiUrl, {
        month,
        quizId: tokenQuizId.trim(),
        quantity,
      });
      setTokenMessage(data?.message || `${quantity} tokens gerados.`);
      await loadTokenStats();
    } catch (err: any) {
      setTokenMessage(err?.message || 'Falha ao gerar tokens.');
    } finally {
      setTokenGenerating(false);
    }
  };

  const handleSavePrize = async () => {
    if (!apiUrl) {
      setPrizeMessage('URL da API não configurada.');
      return;
    }

    if (!prizeImageInput.trim()) {
      setPrizeMessage('Informe a URL da imagem do prêmio.');
      return;
    }

    setPrizeSaving(true);
    setPrizeMessage('');
    try {
      const saved = await quizService.saveAsyncPrize(apiUrl, {
        month,
        title: prizeTitle.trim() || `Prêmio do mês ${month}`,
        imageUrl: prizeImageInput.trim(),
        sourceUrl: prizeImageInput.trim(),
      });
      setPrize(saved);
      setPrizeTitle(saved.title || '');
      setPrizeImageInput(saved.sourceUrl || saved.imageUrl || prizeImageInput.trim());
      setPrizeMessage('Prêmio salvo com sucesso.');
    } catch (err: any) {
      setPrizeMessage(err?.message || 'Falha ao salvar prêmio.');
    } finally {
      setPrizeSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <Tag color="blue">Admin</Tag>
            <h2 className="text-3xl font-bold mt-3">Painel de Resultados</h2>
            <p className="text-white/60 mt-2">Dados consolidados da aba RESULTADOS.</p>
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
            <Button variant="secondary" onClick={() => navigate('/admin')}>
              Voltar
            </Button>
            <Button onClick={loadResults}>
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Mês</p>
          <p className="text-2xl font-black text-blue-300">{monthTag || '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Jogadores</p>
          <p className="text-2xl font-black text-green-300">{totalPlayers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Resultados</p>
          <p className="text-2xl font-black text-white">{totalResults}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Tokens de Acesso Mensal</h3>
          <Tag color="amber">1 tentativa por dispositivo</Tag>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">quizId</label>
            <input
              type="text"
              value={tokenQuizId}
              onChange={(e) => setTokenQuizId(e.target.value)}
              placeholder="quiz_thechosen"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Quantidade</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={tokenQuantity}
              onChange={(e) => setTokenQuantity(Number(e.target.value || 0))}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-3">
            <Button onClick={handleGenerateTokens} disabled={tokenGenerating || tokenLoading || !tokenQuizId}>
              {tokenGenerating ? 'Gerando...' : 'Gerar Lote'}
            </Button>
            <Button variant="secondary" onClick={() => void loadTokenStats()} disabled={tokenLoading || !tokenQuizId}>
              {tokenLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <p className="text-xs uppercase tracking-widest opacity-60">Total</p>
            <p className="text-xl font-black">{tokenStats.total}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-widest opacity-60">Disponíveis</p>
            <p className="text-xl font-black text-green-300">{tokenStats.available}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-widest opacity-60">Reservados</p>
            <p className="text-xl font-black text-amber-300">{tokenStats.reserved}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-widest opacity-60">Usados</p>
            <p className="text-xl font-black text-blue-300">{tokenStats.completed}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs uppercase tracking-widest opacity-60">Expirados</p>
            <p className="text-xl font-black text-white">{tokenStats.expired}</p>
          </Card>
        </div>

        {tokenMessage && (
          <p className="text-sm text-blue-200 mt-3">{tokenMessage}</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Prêmio do Mês</h3>
          {monthTag && <Tag color="green">{monthTag}</Tag>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Título do prêmio</label>
              <input
                type="text"
                value={prizeTitle}
                onChange={(e) => setPrizeTitle(e.target.value)}
                placeholder="Ex: Kit especial do mês"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">URL da imagem (Imgur ou direta)</label>
              <input
                type="text"
                value={prizeImageInput}
                onChange={(e) => setPrizeImageInput(e.target.value)}
                placeholder="https://imgur.com/ANEcbcm"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-white/50 mt-2">
                Exemplo: `https://imgur.com/ANEcbcm` (convertido automaticamente para imagem).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSavePrize} disabled={prizeSaving}>
                {prizeSaving ? 'Salvando...' : 'Salvar Prêmio'}
              </Button>
              {prizeMessage && <p className="text-sm text-blue-200">{prizeMessage}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Preview</p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 min-h-[200px]">
              {normalizedPrizePreviewUrl ? (
                <img
                  src={normalizedPrizePreviewUrl}
                  alt={prizeTitle || 'Prêmio do mês'}
                  className="w-full h-52 object-contain rounded-lg bg-black/20"
                />
              ) : prize?.imageUrl ? (
                <img
                  src={prize.imageUrl}
                  alt={prize.title || 'Prêmio do mês'}
                  className="w-full h-52 object-contain rounded-lg bg-black/20"
                />
              ) : (
                <div className="w-full h-52 flex items-center justify-center text-white/50 text-sm text-center px-6">
                  Nenhuma imagem de prêmio configurada para este mês.
                </div>
              )}
              <p className="mt-3 text-sm text-white/80">{prizeTitle || prize?.title || 'Prêmio do mês'}</p>
            </div>
          </div>
        </div>
      </Card>

      {loading && (
        <Card className="text-center p-8">
          <LoadingSpinner label="Carregando resultados..." />
        </Card>
      )}

      {!loading && error && (
        <Card className="text-center p-8 border-red-500/40">
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Ranking Mensal</h3>
              {monthTag && <Tag color="blue">{monthTag}</Tag>}
            </div>

            {ranking.length > 0 ? (
              <LeaderboardTable entries={ranking} />
            ) : (
              <Card className="text-center p-6">
                <p className="text-white/60">Sem ranking para o mês selecionado.</p>
              </Card>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3">Últimos Resultados ({monthTag})</h3>
            {latestResults.length === 0 ? (
              <Card className="text-center p-6">
                <p className="text-white/60">Nenhum resultado encontrado no período.</p>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="p-4 font-bold text-blue-400">Data</th>
                        <th className="p-4 font-bold text-blue-400">Jogador</th>
                        <th className="p-4 font-bold text-blue-400">Quiz</th>
                        <th className="p-4 font-bold text-blue-400 text-right">Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestResults.map((result, idx) => (
                        <tr key={`${result.userId}-${result.quizId}-${result.timestamp}-${idx}`} className="border-t border-white/5">
                          <td className="p-4">{result.timestamp || result.data}</td>
                          <td className="p-4">{result.nome}</td>
                          <td className="p-4">{result.quizId}</td>
                          <td className="p-4 text-right font-bold text-blue-300">{result.pontuacao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};
