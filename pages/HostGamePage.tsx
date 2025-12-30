
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
import { Tag } from '../components/ui/Tag';

export const HostGamePage: React.FC = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { gameState, apiUrl, hostId } = useGameStore();
  
  useGamePolling(pin || null, true);

  const { timeLeft, isUrgent } = useQuestionTimer(
    gameState?.questionStartTime || 0,
    gameState?.tempoPorPergunta || 0,
    () => {
      // Quando o tempo acaba, se estiver em QUESTION, pula para revelar resposta
      if (gameState?.status === 'QUESTION' && hostId) {
        gameService.nextGameState(apiUrl, pin!, hostId);
      }
    }
  );

  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(10);
  const status = gameState?.status;
  const modoAutomatico = gameState?.modoDeJogo === 'automatico';

  // Gerenciamento dos Timers de Transição Automática
  useEffect(() => {
    let interval: any;
    
    if (modoAutomatico && hostId) {
      if (status === 'ANSWER_REVEAL') {
        // Na revelação da resposta, esperamos 5 segundos
        setAutoAdvanceTimer(5);
        interval = setInterval(() => {
          setAutoAdvanceTimer(prev => {
            if (prev <= 1) {
              gameService.nextGameState(apiUrl, pin!, hostId);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (status === 'LEADERBOARD') {
        // No Placar, esperamos 10 segundos (conforme solicitado)
        setAutoAdvanceTimer(10);
        interval = setInterval(() => {
          setAutoAdvanceTimer(prev => {
            if (prev <= 1) {
              gameService.nextGameState(apiUrl, pin!, hostId);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearInterval(interval);
  }, [status, modoAutomatico, pin, hostId, apiUrl]);

  if (!gameState) {
    return <div className="p-12 text-center">Carregando jogo...</div>;
  }

  const handleStart = () => hostId && gameService.startGame(apiUrl, pin!, hostId);
  const handleNext = () => hostId && gameService.nextGameState(apiUrl, pin!, hostId);

  const players = Object.values(gameState.players);
  const playerCount = players.length;
  const answers = gameState.answers || {};
  const answerCount = Object.keys(answers).length;

  // Se todos responderam e for automático, podemos avançar antes do tempo
  useEffect(() => {
    if (status === 'QUESTION' && modoAutomatico && playerCount > 0 && answerCount === playerCount && hostId) {
      // Pequeno delay para não ser instantâneo e dar susto
      const t = setTimeout(() => {
        gameService.nextGameState(apiUrl, pin!, hostId);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [answerCount, playerCount, status, modoAutomatico, hostId, apiUrl, pin]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {status === 'LOBBY' && (
        <div className="flex flex-col items-center">
          <Card className="w-full max-w-2xl text-center" heavy>
            <p className="text-white/60 mb-2 uppercase tracking-widest text-sm font-bold">Acesse pelo celular</p>
            <h1 className="text-7xl font-black mb-8 text-blue-400 drop-shadow-lg">PIN: {pin}</h1>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12 min-h-[100px] p-6 bg-black/20 rounded-2xl border border-white/5">
              {playerCount === 0 ? (
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                  <p className="italic text-sm">Aguardando jogadores...</p>
                </div>
              ) : (
                players.map((p: any) => (
                  <div key={p.nome} className="glass px-4 py-2 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in duration-300 shadow-lg border-white/10">
                    <span className="text-xl">{p.avatar}</span>
                    <span className="font-bold">{p.nome}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" fullWidth onClick={() => navigate('/')}>Sair</Button>
              <Button fullWidth size="lg" disabled={playerCount === 0} onClick={handleStart}>
                {playerCount === 0 ? 'Aguardando Jogadores' : `Iniciar com ${playerCount} Jogadores 🚀`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {status === 'QUESTION' && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-end mb-6">
            <div className="flex flex-col gap-2">
               <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Tempo Restante</span>
               <GameTimer timeLeft={timeLeft} isUrgent={isUrgent} />
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Progresso</span>
               <div className="glass-heavy px-6 py-3 rounded-2xl font-black text-2xl flex items-center gap-3">
                 <span className="text-blue-400">{answerCount}</span>
                 <span className="opacity-30">/</span>
                 <span>{playerCount}</span>
               </div>
            </div>
          </div>

          <QuestionCard 
            text={gameState.perguntas[gameState.currentQuestionIndex].pergunta}
            index={gameState.currentQuestionIndex}
            total={gameState.perguntas.length}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <QuestionOptionsGrid 
                options={gameState.perguntas[gameState.currentQuestionIndex].opcoes}
                disabled={true}
              />
            </div>
            
            {/* NOVO: Status dos Jogadores em Tempo Real */}
            <div className="lg:col-span-1">
              <Card className="h-full bg-black/30 border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">Status</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {players.map((p: any) => {
                    const hasAnswered = answers[p.nome];
                    return (
                      <div key={p.nome} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${hasAnswered ? 'bg-green-500/20' : 'bg-white/5 opacity-60'}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-sm">{p.avatar}</span>
                          <span className="text-xs font-bold truncate">{p.nome}</span>
                        </div>
                        {hasAnswered ? (
                          <span className="text-green-400 text-xs font-bold">✓</span>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
             <Button variant="outline" size="sm" onClick={handleNext}>Pular Pergunta</Button>
          </div>
        </div>
      )}

      {status === 'ANSWER_REVEAL' && (
        <div className="animate-in zoom-in duration-500 text-center">
          <div className="inline-block px-8 py-2 bg-green-500/20 text-green-400 rounded-full font-black uppercase tracking-widest text-sm mb-6 border border-green-500/30">
            Resposta Correta Revelada
          </div>
          
          <QuestionCard 
            text={gameState.perguntas[gameState.currentQuestionIndex].pergunta}
            index={gameState.currentQuestionIndex}
            total={gameState.perguntas.length}
          />
          
          <div className="max-w-4xl mx-auto">
            <QuestionOptionsGrid 
              options={gameState.perguntas[gameState.currentQuestionIndex].opcoes}
              correctIndex={gameState.lastCorrectAnswer}
              reveal={true}
              disabled={true}
            />
          </div>

          <div className="mt-12">
            {modoAutomatico ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/40 text-sm font-medium">Mostrando placar em</p>
                <div className="text-3xl font-black text-blue-400">{autoAdvanceTimer}s</div>
              </div>
            ) : (
              <Button size="lg" onClick={handleNext}>📊 Ver Placar da Rodada</Button>
            )}
          </div>
        </div>
      )}

      {status === 'LEADERBOARD' && (
        <div className="animate-in slide-in-from-right duration-500 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">Classificação <span className="text-blue-400">EAC</span></h2>
            
            {modoAutomatico && (
              <div className="flex items-center gap-3 glass-heavy px-4 py-2 rounded-xl border border-blue-500/30">
                <span className="text-xs font-bold text-white/60">PRÓXIMA EM</span>
                <span className="text-2xl font-black text-blue-400 w-8 text-center">{autoAdvanceTimer}</span>
              </div>
            )}
          </div>

          <LeaderboardTable entries={gameState.leaderboard} />
          
          <div className="mt-12 flex justify-center">
            {!modoAutomatico && (
              <Button size="lg" onClick={handleNext} className="min-w-[200px]">
                {gameState.currentQuestionIndex < gameState.perguntas.length - 1 ? 'Próxima Pergunta ➔' : 'Ver Pódio Final 🏆'}
              </Button>
            )}
          </div>
        </div>
      )}

      {status === 'FINAL' && (
        <div className="animate-in slide-in-from-bottom duration-1000">
          <div className="text-center mb-12">
            <h2 className="text-6xl font-black mb-2 tracking-tighter uppercase italic">Campeões <span className="text-blue-400">EAC</span></h2>
            <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full"></div>
          </div>
          
          <Podium entries={gameState.leaderboard} />
          
          <div className="max-w-3xl mx-auto mt-20">
            <h3 className="text-xl font-bold mb-6 text-white/40 uppercase tracking-widest text-center">Classificação Final</h3>
            <LeaderboardTable entries={gameState.leaderboard} />
          </div>
          
          <div className="mt-16 flex justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/')}>Encerrar e Voltar</Button>
          </div>
        </div>
      )}
    </div>
  );
};
