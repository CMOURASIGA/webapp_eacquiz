
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { clearGame } = useGameStore();

  const handleJoin = () => {
    clearGame();
    navigate('/player/join');
  };

  const handleCreate = () => {
    clearGame();
    navigate('/host/quizzes');
  };

  const resumePin = localStorage.getItem('eac_last_pin');
  const hasResumableGame = !!resumePin;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="mb-8 text-center animate-bounce">
         <div className="inline-block w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center font-bold text-4xl text-white shadow-2xl">E</div>
      </div>
      
      <Card className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">EAC Quiz</h1>
        <p className="text-white/60 mb-8">A plataforma de aprendizado gamificado em tempo real.</p>
        
        <div className="space-y-4">
          <Button fullWidth size="lg" onClick={handleJoin}>
            🙋‍♂️ Entrar no Jogo
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={handleCreate}>
            👑 Criar Sala
          </Button>
          <Button variant="outline" fullWidth onClick={() => navigate('/settings')}>
            ⚙️ Configurações
          </Button>
        </div>

        {hasResumableGame && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm opacity-60 mb-3">Vimos que você jogou recentemente:</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/player/game/${resumePin}`)}>
              Retomar Jogo (PIN {resumePin})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
