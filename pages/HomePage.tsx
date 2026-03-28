
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { APP_BRAND_TEXT_HIGHLIGHT, APP_BRAND_TEXT_PRIMARY, APP_BRAND_TITLE, APP_LOGO_FALLBACK_URL, APP_LOGO_URL } from '../utils/branding';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { clearGame, apiUrl, setMode } = useGameStore();

  const handleLiveQuiz = () => {
    clearGame();
    setMode('live');
    navigate('/player/join');
  };

  const handleMonthlyQuiz = () => {
    clearGame();
    setMode('async');
    navigate('/quiz');
  };

  const resumePin = localStorage.getItem('eac_last_pin');
  const hasResumableGame = !!resumePin;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-700">
      <div className="mb-8 text-center animate-bounce">
         <img 
          src={APP_LOGO_URL}
          alt={`${APP_BRAND_TITLE} Logo`}
          className="w-32 h-32 object-contain rounded-2xl shadow-2xl bg-blue-500/10 p-2"
          onError={(e) => {
            (e.target as any).src = APP_LOGO_FALLBACK_URL;
          }}
        />
      </div>
      
      <Card className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">
          {APP_BRAND_TEXT_PRIMARY} <span className="text-blue-400">{APP_BRAND_TEXT_HIGHLIGHT}</span>
        </h1>
        <p className="text-white/60 mb-8">Escolha como deseja jogar.</p>
        
        <div className="space-y-4">
          <Button fullWidth size="lg" onClick={handleMonthlyQuiz}>
            📅 Quiz Mensal
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => navigate('/ranking')}>
            🏆 Ranking Mensal
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={handleLiveQuiz}>
            ⚡ Quiz Live
          </Button>
          <Button variant="outline" fullWidth onClick={() => navigate('/admin/login')}>
            🔐 Acesso Admin
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMode('live');
                navigate(`/player/game/${resumePin}`);
              }}
            >
              Retomar Jogo (PIN {resumePin})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
