
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
  
  // Polling ativo enquanto houver um PIN
  useGamePolling(pin || null, true);

  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(10);
  const status = gameState?.status || 'LOBBY';
  const modoAutomatico = gameState?.modoDeJogo === 'automatico';

  const { timeLeft, isUrgent } = useQuestionTimer(
    gameState?.questionStartTime || 0,
    gameState?.tempoPorPergunta || 0,
    () => {
      // Quando o tempo da pergunta acaba, vai para a revelação
      if (status === 'QUESTION' && hostId && pin) {
        gameService.nextGameState(apiUrl, pin, hostId);
      }
    }
  );

  // Efeito para gerenciar transições automáticas de status
  useEffect(() => {
    let interval: any;
    
    if (modoAutomatico && hostId && pin) {
      if (status === 'ANSWER_REVEAL') {
        setAutoAdvanceTimer(5);
        interval = setInterval(() => {
          setAutoAdvanceTimer(prev => {
            if (prev <= 1) {
              gameService.nextGameState(apiUrl, pin, hostId);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (status === 'LEADERBOARD') {
        setAutoAdvanceTimer(10);
        interval = setInterval(() => {
          setAutoAdvanceTimer(prev => {
            if (prev <= 1) {
              gameService.nextGameState(apiUrl, pin, hostId);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearInterval(interval);
  }, [status, modoAutomatico, pin, hostId, apiUrl]);

  // Se não houver gameState ainda, mostra carregamento mas mantendo o layout
  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <h2 className="text-2xl font-bold">Iniciando Sala {pin}...</h2>
        <p className="opacity-60">Sincronizando com o Google Sheets</p>
        <Button variant="outline" className="mt-8" onClick={() => navigate('/')}>Cancelar e Voltar</Button>
      </div>
    );
  }

  const handleStart = () => hostId && pin && gameService.startGame(apiUrl, pin, hostId);
  const handleNext = () => hostId && pin && gameService.nextGameState(apiUrl, pin, hostId);

  const playersList = Object.values(gameState?.players || {});
  const playerCount = playersList.length;
  const answersCount = Object.keys(gameState?.answers || {}).length;

  // Se todos responderam antes do tempo no modo automático
  useEffect(() => {
    if (status === 'QUESTION' && modoAutomatico && playerCount > 0 && answersCount === playerCount && hostId && pin) {
      const t = setTimeout(() => {
        gameService.nextGameState(apiUrl, pin, hostId);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [answersCount, playerCount, status, modoAutomatico, hostId, apiUrl, pin]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* TELA DE LOBBY */}
      {status === 'LOBBY' && (
        <div className="flex flex-col items-center animate-in zoom-in duration-500">
          <Card className="w-full max-w-2xl text-center" heavy>
            <p className="text-white/60 mb-2 uppercase tracking-widest text-sm font-bold">Aguardando participantes</p>
            <h1 className="text-8xl font-black mb-8 text-blue-400 drop-shadow-2xl">PIN: {pin}</h1>
            
            <div className="bg-black/20 rounded-3xl p-8 mb-10 border border-white/5 min-h-[160px] flex flex-wrap justify-center gap-4 items-center">
              {playerCount === 0 ? (
                <div className="flex flex-col items-center gap-4 opacity-30">
                  <div className="animate-pulse w-3 h-3 bg-white rounded-full"></div>
                  <p className="italic text-lg">Acesse pelo celular para entrar...</p>
                </div>
              ) : (
                playersList.map((p: any) => (
                  <div key={p.id || p.nome} className="glass px-5 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 shadow-xl border-white/10">
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-bold text-lg">{p.nome}</span>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" size="lg" onClick={() => navigate('/')}>Sair</Button>
              <Button fullWidth size="lg" disabled={playerCount === 0} onClick={handleStart} className="shadow-lg shadow-blue-600/20">
                {playerCount === 0 ? 'Aguardando Jogadores' : `Iniciar Jogo (${playerCount}) 🚀`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TELA DE PERGUNTA ATIVA */}
      {status === 'QUESTION' && (
        <div className="animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-end mb-6">
            <div className="flex flex-col gap-2">
               <span className="text-xs font-bold uppercase tracking-widest text-blue-400 opacity-60">Tempo Restante</span>
               <GameTimer timeLeft={timeLeft} isUrgent={isUrgent} />
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <span className="text-xs font-bold uppercase tracking-widest text-blue-400 opacity-60">Respostas Recebidas</span>
               <div className="glass-heavy px-6 py-3 rounded-2xl font-black text-3xl flex items-center gap-3 border-white/10">
                 <span className="text-blue-400">{answersCount}</span>
                 <span className="opacity-20">/</span>
                 <span>{playerCount}</span>
               </div>
            </div>
          </div>

          <QuestionCard 
            text={gameState.perguntas[gameState.currentQuestionIndex]?.pergunta || "Carregando pergunta..."}
            index={gameState.currentQuestionIndex}
            total={gameState.perguntas.length}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <QuestionOptionsGrid 
                options={gameState.perguntas[gameState.currentQuestionIndex]?.opcoes || []}
                disabled={true}
              />
            </div>
            
            <div className="lg:col-span-1">
              <Card className="h-full bg-black/30 border-white/5 flex flex-col p-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-2">Jogadores</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex-grow">
                  {playersList.map((p: any) => {
                    const hasAnswered = gameState.answers && gameState.answers[p.nome];
                    return (
                      <div key={p.nome} className={`flex items-center justify-between p-3 rounded-xl transition-all ${hasAnswered ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 opacity-60'}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-base">{p.avatar}</span>
                          <span className="text-sm font-bold truncate">{p.nome}</span>
                        </div>
                        {hasAnswered && <span className="text-green-400 font-bold text-xs">OK</span>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
             <Button variant="outline" size="sm" onClick={handleNext}>Pular Pergunta ⏭️</Button>
          </div>
        </div>
      )}

      {/* TELA DE REVELAÇÃO DA RESPOSTA */}
      {status === 'ANSWER_REVEAL' && (
        <div className="animate-in zoom-in duration-500 text-center">
          <div className="inline-block px-8 py-2 bg-green-500/20 text-green-400 rounded-full font-black uppercase tracking-widest text-sm mb-6 border border-green-500/30">
            Confira a Correta!
          </div>
          
          <QuestionCard 
            text={gameState.perguntas[gameState.currentQuestionIndex]?.pergunta || ""}
            index={gameState.currentQuestionIndex}
            total={gameState.perguntas.length}
          />
          
          <div className="max-w-4xl mx-auto">
            <QuestionOptionsGrid 
              options={gameState.perguntas[gameState.currentQuestionIndex]?.opcoes || []}
              correctIndex={gameState.lastCorrectAnswer}
              reveal={true}
              disabled={true}
            />
          </div>

          <div className="mt-12">
            {modoAutomatico ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Próximo em</p>
                <div className="text-4xl font-black text-blue-400 bg-blue-500/10 px-6 py-2 rounded-2xl border border-blue-500/20">
                  {autoAdvanceTimer}s
                </div>
              </div>
            ) : (
              <Button size="lg" onClick={handleNext}>Ver Placar 📊</Button>
            )}
          </div>
        </div>
      )}

      {/* TELA DE PLACAR / LEADERBOARD */}
      {status === 'LEADERBOARD' && (
        <div className="animate-in slide-in-from-right duration-500 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Classificação <span className="text-blue-400">EAC</span></h2>
            
            {modoAutomatico && (
              <div className="flex items-center gap-4 glass-heavy px-6 py-3 rounded-2xl border border-blue-500/30">
                <span className="text-xs font-bold text-white/50 uppercase tracking-tighter">Próxima Pergunta em</span>
                <span className="text-3xl font-black text-blue-400 w-10 text-center">{autoAdvanceTimer}</span>
              </div>
            )}
          </div>

          <LeaderboardTable entries={gameState.leaderboard || []} />
          
          <div className="mt-12 flex justify-center">
            {!modoAutomatico && (
              <Button size="lg" onClick={handleNext} className="min-w-[240px]">
                {gameState.currentQuestionIndex < gameState.perguntas.length - 1 ? 'Continuar ➔' : 'Ver Pódio Final 🏆'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TELA FINAL / PÓDIO */}
      {status === 'FINAL' && (
        <div className="animate-in slide-in-from-bottom duration-1000">
          <div className="text-center mb-16">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic">Campeões <span className="text-blue-400">EAC</span></h2>
            <div className="w-32 h-2 bg-blue-500 mx-auto rounded-full shadow-lg shadow-blue-500/50"></div>
          </div>
          
          <Podium entries={gameState.leaderboard || []} />
          
          <div className="max-w-3xl mx-auto mt-24">
            <h3 className="text-xl font-bold mb-8 text-white/30 uppercase tracking-widest text-center">Classificação Geral</h3>
            <LeaderboardTable entries={gameState.leaderboard || []} />
          </div>
          
          <div className="mt-20 flex justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/')}>Fechar Sala e Voltar</Button>
          </div>
        </div>
      )}
    </div>
  );
};
