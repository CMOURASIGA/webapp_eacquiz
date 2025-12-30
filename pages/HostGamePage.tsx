
import React, { useEffect, useState, useRef } from 'react';
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
  
  // Keep polling active
  useGamePolling(pin || null, true);

  const status = gameState?.status || 'LOBBY';
  const modoAutomatico = gameState?.modoDeJogo === 'automatico';
  const tempoNoPlacar = gameState?.tempoNoPlacar || 10;
  const currentIdx = gameState?.currentQuestionIndex || 0;

  // Local timer for intermediate states (Reveal/Leaderboard)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(10);
  // Prevent double transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Track last processed state to unlock transitions
  const lastStateKey = useRef<string>("");

  const triggerNextState = async () => {
    const currentKey = `${status}_${currentIdx}`;
    
    // If we already sent a request for this specific state/index, wait
    if (isTransitioning || lastStateKey.current === currentKey) return;

    if (hostId && pin) {
      setIsTransitioning(true);
      lastStateKey.current = currentKey;
      
      try {
        await gameService.nextGameState(apiUrl, pin, hostId);
      } catch (err) {
        console.error("Transition failed:", err);
        // On error, reset so we can try again
        setIsTransitioning(false);
        lastStateKey.current = "";
      }
    }
  };

  // Reset transition lock when the polled state actually changes
  useEffect(() => {
    if (gameState) {
      const currentKey = `${gameState.status}_${gameState.currentQuestionIndex}`;
      if (currentKey !== lastStateKey.current) {
        setIsTransitioning(false);
      }
    }
  }, [gameState?.status, gameState?.currentQuestionIndex]);

  // Main Question Timer
  const { timeLeft, isUrgent } = useQuestionTimer(
    status === 'QUESTION' ? (gameState?.questionStartTime || 0) : 0,
    gameState?.tempoPorPergunta || 20,
    () => {
      if (status === 'QUESTION' && modoAutomatico && !isTransitioning) {
        triggerNextState();
      }
    }
  );

  // Logic for intermediate states (Reveal and Leaderboard)
  useEffect(() => {
    let interval: any;
    
    if (modoAutomatico && !isTransitioning) {
      if (status === 'ANSWER_REVEAL') {
        // Fast 3s reveal before leaderboard
        setAutoAdvanceTimer(3);
        interval = setInterval(() => {
          setAutoAdvanceTimer(prev => {
            if (prev <= 1) {
              triggerNextState();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (status === 'LEADERBOARD') {
        // Strict 10s (or configured) leaderboard
        setAutoAdvanceTimer(tempoNoPlacar);
        interval = setInterval(() => {
          setAutoAdvanceTimer(prev => {
            if (prev <= 1) {
              triggerNextState();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, modoAutomatico, tempoNoPlacar, currentIdx, isTransitioning]);

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <h2 className="text-2xl font-bold">Aguardando Sala {pin}...</h2>
      </div>
    );
  }

  const handleStart = () => hostId && pin && gameService.startGame(apiUrl, pin, hostId);
  const handleManualNext = () => triggerNextState();

  const playersList = Object.values(gameState.players || {});
  const answersCount = Object.keys(gameState.answers || {}).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* LOBBY */}
      {status === 'LOBBY' && (
        <div className="flex flex-col items-center animate-in zoom-in duration-500">
          <Card className="w-full max-w-2xl text-center" heavy>
            <p className="text-white/60 mb-2 uppercase tracking-widest text-sm font-bold">Lobby da Sala</p>
            <h1 className="text-8xl font-black mb-8 text-blue-400 drop-shadow-2xl">PIN: {pin}</h1>
            
            <div className="bg-black/20 rounded-3xl p-8 mb-10 border border-white/5 min-h-[160px] flex flex-wrap justify-center gap-4 items-center">
              {playersList.length === 0 ? (
                <div className="opacity-30 flex flex-col items-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-white rounded-full"></div>
                  <p className="italic">Aguardando jogadores...</p>
                </div>
              ) : (
                playersList.map((p: any) => (
                  <div key={p.nome} className="glass px-5 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in scale-in duration-300">
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-bold text-lg">{p.nome}</span>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" size="lg" onClick={() => navigate('/')}>Cancelar</Button>
              <Button fullWidth size="lg" disabled={playersList.length === 0} onClick={handleStart} className="shadow-lg shadow-blue-500/20">
                Iniciar Jogo 🚀
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* QUESTION */}
      {status === 'QUESTION' && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-end mb-6">
            <div className="flex flex-col gap-2">
               <span className="text-xs font-bold uppercase tracking-widest text-blue-400 opacity-60">Tempo para Resposta</span>
               <GameTimer timeLeft={timeLeft} isUrgent={isUrgent} />
            </div>
            
            <div className="flex flex-col items-end gap-2 text-right">
               <span className="text-xs font-bold uppercase tracking-widest text-blue-400 opacity-60">Participação</span>
               <div className="glass-heavy px-6 py-3 rounded-2xl font-black text-2xl border-white/10">
                 <span className="text-blue-400">{answersCount}</span>
                 <span className="opacity-20 mx-2">/</span>
                 <span>{playersList.length}</span>
               </div>
            </div>
          </div>

          <QuestionCard 
            text={gameState.perguntas[currentIdx]?.pergunta || ""}
            index={currentIdx}
            total={gameState.perguntas.length}
          />

          <QuestionOptionsGrid 
            options={gameState.perguntas[currentIdx]?.opcoes || []}
            disabled={true}
          />

          <div className="mt-8 flex justify-center">
             <Button variant="outline" size="sm" onClick={handleManualNext} disabled={isTransitioning}>
               {isTransitioning ? 'Processando...' : 'Pular Pergunta ⏭️'}
             </Button>
          </div>
        </div>
      )}

      {/* ANSWER REVEAL */}
      {status === 'ANSWER_REVEAL' && (
        <div className="animate-in zoom-in duration-500 text-center">
          <div className="inline-block px-8 py-2 bg-green-500/20 text-green-400 rounded-full font-black uppercase tracking-widest text-sm mb-6 border border-green-500/30">
            Resposta Correta
          </div>
          
          <QuestionCard 
            text={gameState.perguntas[currentIdx]?.pergunta || ""}
            index={currentIdx}
            total={gameState.perguntas.length}
          />
          
          <div className="max-w-4xl mx-auto">
            <QuestionOptionsGrid 
              options={gameState.perguntas[currentIdx]?.opcoes || []}
              correctIndex={gameState.lastCorrectAnswer}
              reveal={true}
              disabled={true}
            />
          </div>

          <div className="mt-12">
            {modoAutomatico ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Calculando placar em</p>
                <div className="text-3xl font-black text-blue-400 bg-blue-500/10 px-6 py-2 rounded-2xl border border-blue-500/20">
                  {autoAdvanceTimer}s
                </div>
              </div>
            ) : (
              <Button size="lg" onClick={handleManualNext} disabled={isTransitioning}>
                {isTransitioning ? 'Aguarde...' : 'Ver Placar 📊'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {status === 'LEADERBOARD' && (
        <div className="animate-in slide-in-from-right duration-500 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Classificação <span className="text-blue-400">EAC</span></h2>
            
            {modoAutomatico && (
              <div className="flex items-center gap-4 glass-heavy px-6 py-3 rounded-2xl border border-blue-500/30">
                <span className="text-xs font-bold text-white/50 uppercase tracking-tighter">Próxima Rodada em</span>
                <span className="text-3xl font-black text-blue-400 w-10 text-center">{autoAdvanceTimer}</span>
              </div>
            )}
          </div>

          <LeaderboardTable entries={gameState.leaderboard || []} />
          
          {!modoAutomatico && (
            <div className="mt-12 flex justify-center">
              <Button size="lg" onClick={handleManualNext} disabled={isTransitioning} className="min-w-[240px]">
                {isTransitioning ? 'Carregando...' : (currentIdx < gameState.perguntas.length - 1 ? 'Continuar ➔' : 'Ver Resultado Final 🏆')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* FINAL */}
      {status === 'FINAL' && (
        <div className="animate-in slide-in-from-bottom duration-1000">
          <div className="text-center mb-16">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic">Vencedores <span className="text-blue-400">EAC</span></h2>
            <div className="w-32 h-2 bg-blue-500 mx-auto rounded-full shadow-lg shadow-blue-500/50"></div>
          </div>
          
          <Podium entries={gameState.leaderboard || []} />
          
          <div className="max-w-3xl mx-auto mt-24">
            <h3 className="text-xl font-bold mb-8 text-white/30 uppercase tracking-widest text-center">Ranking Geral</h3>
            <LeaderboardTable entries={gameState.leaderboard || []} />
          </div>
          
          <div className="mt-20 flex justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/')}>Voltar ao Início</Button>
          </div>
        </div>
      )}
    </div>
  );
};
