
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { clearGame, apiUrl } = useGameStore();

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
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-700">
      <div className="mb-8 text-center animate-bounce">
         <img 
          src="https://i.imgur.com/c5XQ7TW.png" 
          alt="EAC Logo" 
          className="w-32 h-32 object-contain rounded-2xl shadow-2xl bg-blue-500/10 p-2"
          onError={(e) => {
            (e.target as any).src = 'https://i.imgur.com/Uo2eG7x.png'; 
          }}
        />
      </div>
      
      <Card className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">EAC Quiz</h1>
        <p className="text-white/60 mb-8">A plataforma de aprendizado gamificado em tempo real integrada com Google Sheets.</p>
        
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

        {!apiUrl && (
          <div className="mt-6 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl">
            <p className="text-xs text-amber-200">
              ⚠️ A URL da API do Google Sheets não está configurada. Vá em Configurações para conectar sua planilha.
            </p>
          </div>
        )}

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
