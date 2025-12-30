
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGamePolling } from '../hooks/useGamePolling';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { gameService } from '../services/gameService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QuestionCard } from '../components/game/QuestionCard';
import { QuestionOptionsGrid } from '../components/game/QuestionOptionsGrid';
import { LeaderboardTable } from '../components/game/LeaderboardTable';
import { Podium } from '../components/game/Podium';
import { GameTimer } from '../components/game/GameTimer';

export const HostGamePage: React.FC = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { gameState, apiUrl, hostId } = useGameStore();
  
  useGamePolling(pin || null, true);

  const { timeLeft, isUrgent } = useQuestionTimer(
    gameState?.questionStartTime || 0,
    gameState?.tempoPorPergunta || 0,
    () => {
      if (gameState?.status === 'QUESTION' && hostId) {
        gameService.nextGameState(apiUrl, pin!, hostId);
      }
    }
  );

  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(5);

  useEffect(() => {
    let interval: any;
    if (gameState?.modoDeJogo === 'automatico' && (gameState.status === 'ANSWER_REVEAL' || gameState.status === 'LEADERBOARD')) {
      setAutoAdvanceTimer(5);
      interval = setInterval(() => {
        setAutoAdvanceTimer(prev => {
          if (prev <= 1) {
            if (hostId) gameService.nextGameState(apiUrl, pin!, hostId);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.modoDeJogo, pin, hostId, apiUrl]);

  if (!gameState) {
    return <div className="p-12 text-center">Carregando jogo...</div>;
  }

  const handleStart = () => hostId && gameService.startGame(apiUrl, pin!, hostId);
  const handleNext = () => hostId && gameService.nextGameState(apiUrl, pin!, hostId);

  const playerCount = Object.keys(gameState.players).length;
  const answerCount = Object.keys(gameState.answers || {}).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {gameState.status === 'LOBBY' && (
        <div className="flex flex-col items-center">
          <Card className="w-full max-w-2xl text-center" heavy>
            <p className="text-white/60 mb-2 uppercase tracking-widest text-sm">Entre no jogo em</p>
            <h1 className="text-7xl font-black mb-8 text-blue-400">PIN: {pin}</h1>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12 min-h-[60px]">
              {playerCount === 0 ? (
                <p className="text-white/40 italic">Aguardando jogadores entrarem...</p>
              ) : (
                Object.values(gameState.players).map((p: any) => (
                  <div key={p.nome} className="glass px-4 py-2 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in duration-500">
                    <span className="text-xl">{p.avatar}</span>
                    <span className="font-bold">{p.nome}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" fullWidth onClick={() => navigate('/')}>Cancelar</Button>
              <Button fullWidth size="lg" disabled={playerCount === 0} onClick={handleStart}>
                Iniciar Jogo ({playerCount} Jogadores)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {gameState.status === 'QUESTION' && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center mb-6">
            <GameTimer timeLeft={timeLeft} isUrgent={isUrgent} />
            <div className="glass px-6 py-2 rounded-full font-bold">
              {answerCount} de {playerCount} respostas enviadas
            </div>
          </div>
          <QuestionCard 
            text={gameState.perguntas[gameState.currentQuestionIndex].pergunta}
            index={gameState.currentQuestionIndex}
            total={gameState.perguntas.length}
          />
          <QuestionOptionsGrid 
            options={gameState.perguntas[gameState.currentQuestionIndex].opcoes}
            disabled={true}
          />
          <div className="mt-8 flex justify-center">
             <Button variant="secondary" onClick={handleNext}>Pular Pergunta</Button>
          </div>
        </div>
      )}

      {gameState.status === 'ANSWER_REVEAL' && (
        <div className="animate-in zoom-in duration-500">
          <h2 className="text-center text-3xl font-bold mb-8 text-green-400">Resposta Correta!</h2>
          <QuestionCard 
            text={gameState.perguntas[gameState.currentQuestionIndex].pergunta}
            index={gameState.currentQuestionIndex}
            total={gameState.perguntas.length}
          />
          <QuestionOptionsGrid 
            options={gameState.perguntas[gameState.currentQuestionIndex].opcoes}
            correctIndex={gameState.lastCorrectAnswer}
            reveal={true}
            disabled={true}
          />
          <div className="mt-10 flex flex-col items-center gap-4">
            {gameState.modoDeJogo === 'automatico' ? (
              <p className="text-white/60">Avançando para o placar em {autoAdvanceTimer}s...</p>
            ) : (
              <Button size="lg" onClick={handleNext}>📊 Mostrar Placar</Button>
            )}
          </div>
        </div>
      )}

      {gameState.status === 'LEADERBOARD' && (
        <div className="animate-in slide-in-from-right duration-500">
          <h2 className="text-center text-3xl font-bold mb-8">Placar Parcial</h2>
          <LeaderboardTable entries={gameState.leaderboard} />
          <div className="mt-10 flex flex-col items-center gap-4">
            {gameState.modoDeJogo === 'automatico' ? (
              <p className="text-white/60">
                {gameState.currentQuestionIndex < gameState.perguntas.length - 1 
                  ? `Próxima pergunta em ${autoAdvanceTimer}s...` 
                  : `Resultado final em ${autoAdvanceTimer}s...`}
              </p>
            ) : (
              <Button size="lg" onClick={handleNext}>
                {gameState.currentQuestionIndex < gameState.perguntas.length - 1 ? 'Próxima Pergunta' : 'Ver Resultado Final'}
              </Button>
            )}
          </div>
        </div>
      )}

      {gameState.status === 'FINAL' && (
        <div className="animate-in slide-in-from-bottom duration-1000">
          <h2 className="text-center text-5xl font-black mb-4">Fim de Jogo! 🏆</h2>
          <Podium entries={gameState.leaderboard} />
          <h3 className="text-2xl font-bold mb-6 mt-12">Ranking Geral</h3>
          <LeaderboardTable entries={gameState.leaderboard} />
          <div className="mt-12 flex justify-center">
            <Button size="lg" onClick={() => navigate('/')}>Voltar ao Início</Button>
          </div>
        </div>
      )}
    </div>
  );
};
