
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGamePolling } from '../hooks/useGamePolling';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { gameService } from '../services/gameService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QuestionOptionsGrid } from '../components/game/QuestionOptionsGrid';
import { LeaderboardTable } from '../components/game/LeaderboardTable';
import { Tag } from '../components/ui/Tag';

export const PlayerGamePage: React.FC = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { gameState, playerId, playerName, clearGame, apiUrl } = useGameStore();
  
  useGamePolling(pin || null, true);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentStatus = gameState?.status;

  useEffect(() => {
    if (currentStatus === 'QUESTION') {
      setSelectedIdx(null);
      setHasAnswered(false);
    }
  }, [currentStatus]);

  const { timeLeft, isUrgent } = useQuestionTimer(
    gameState?.questionStartTime || 0,
    gameState?.tempoPorPergunta || 0
  );

  if (!gameState || !playerId) {
    return <div className="p-12 text-center">Reconectando ao jogo...</div>;
  }

  const handleSelectAnswer = async (idx: number) => {
    if (hasAnswered || !playerName) return;
    
    setSelectedIdx(idx);
    setHasAnswered(true);
    
    const timeSpent = Date.now() - gameState.questionStartTime;
    try {
      await gameService.submitAnswer(apiUrl, pin!, playerName, idx, timeSpent);
    } catch (e) {
      console.error("Erro ao enviar resposta", e);
    }
  };

  const handleExit = () => {
    if (confirm('Tem certeza que deseja sair do jogo?')) {
      clearGame();
      navigate('/');
    }
  };

  const myPlayer = (gameState.players as any)[playerName || ''];
  const lastAns = (gameState.lastAnswers as any)?.[playerName || ''];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <Tag color="blue">Score: {myPlayer?.score || 0}</Tag>
        {currentStatus === 'QUESTION' && <Tag color={isUrgent ? 'red' : 'amber'}>Tempo: {timeLeft}s</Tag>}
        {currentStatus === 'LOBBY' && (
          <Button variant="outline" size="sm" onClick={handleExit}>
            Sair
          </Button>
        )}
      </div>

      {currentStatus === 'LOBBY' && (
        <Card className="text-center p-12 animate-in zoom-in duration-500">
          <div className="animate-bounce text-6xl mb-6">🎮</div>
          <h2 className="text-2xl font-bold mb-2">Você entrou!</h2>
          <p className="text-white/60">Aguardando o anfitrião iniciar o jogo...</p>
          <div className="mt-8 flex flex-col items-center gap-2">
             <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
             <p className="text-xs opacity-40">Dica: Fique atento à tela principal!</p>
          </div>
        </Card>
      )}

      {currentStatus === 'QUESTION' && (
        <div className="animate-in slide-up duration-300">
           <h3 className="text-center text-lg font-medium mb-4 opacity-60">
             Pergunta {gameState.currentQuestionIndex + 1}
           </h3>
           <div className="mb-6 h-1 w-full bg-white/10 rounded-full overflow-hidden">
             <div 
              className="h-full bg-blue-500 transition-all duration-1000" 
              style={{ width: `${(timeLeft / gameState.tempoPorPergunta) * 100}%` }}
             ></div>
           </div>

           {!hasAnswered ? (
             <QuestionOptionsGrid 
               options={gameState.perguntas[gameState.currentQuestionIndex].opcoes}
               onSelect={handleSelectAnswer}
             />
           ) : (
             <Card className="text-center p-12">
               <div className="text-5xl mb-4">⌛</div>
               <h3 className="text-2xl font-bold mb-2">Resposta Enviada!</h3>
               <p className="text-white/60">Aguardando os outros jogadores...</p>
             </Card>
           )}
        </div>
      )}

      {currentStatus === 'ANSWER_REVEAL' && (
        <div className="animate-in zoom-in duration-300">
          <Card className="text-center">
            {lastAns?.respostaIdx === gameState.lastCorrectAnswer ? (
              <div className="py-8">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-3xl font-black text-green-400 mb-2">CORRETO!</h3>
                <p className="text-xl font-bold">+{lastAns.points} pontos</p>
              </div>
            ) : (
              <div className="py-8">
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-3xl font-black text-red-400 mb-2">
                  {lastAns?.respostaIdx === undefined || lastAns?.respostaIdx === null ? 'TEMPO ESGOTADO!' : 'INCORRETO!'}
                </h3>
                <p className="text-white/60">Sorte na próxima!</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-sm opacity-60">
               <span>Total: {myPlayer?.score || 0} pts</span>
               <span>{myPlayer?.correctCount || 0} acertos</span>
            </div>
          </Card>
        </div>
      )}

      {currentStatus === 'LEADERBOARD' && (
        <div className="animate-in slide-in-from-right duration-300">
          <h2 className="text-xl font-bold mb-4 text-center">Sua Posição</h2>
          <LeaderboardTable entries={gameState.leaderboard} highlightId={playerId} />
        </div>
      )}

      {currentStatus === 'FINAL' && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <Card className="text-center mb-8" heavy>
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-2">Fim de Jogo!</h2>
            <p className="text-xl">Você terminou com <span className="text-blue-400 font-black">{myPlayer?.score || 0}</span> pontos!</p>
          </Card>
          <LeaderboardTable entries={gameState.leaderboard} highlightId={playerId} />
          <div className="mt-8">
            <Button fullWidth size="lg" onClick={() => navigate('/')}>Voltar ao Início</Button>
          </div>
        </div>
      )}
    </div>
  );
};
