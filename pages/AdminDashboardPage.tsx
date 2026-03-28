import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { logoutAdmin } from '../utils/adminAuth';
import { useGameStore } from '../store/gameStore';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearGame, setMode } = useGameStore();

  const handleCreateLiveRoom = () => {
    clearGame();
    setMode('live');
    navigate('/host/quizzes');
  };

  const handleSettings = () => {
    setMode('live');
    navigate('/settings');
  };

  const handleOpenLivePlayer = () => {
    clearGame();
    setMode('live');
    navigate('/player/join');
  };

  const handleOpenMonthlyQuiz = () => {
    clearGame();
    setMode('async');
    navigate('/quiz');
  };

  const handleOpenResultsPanel = () => {
    navigate('/admin/resultados');
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/', { replace: true });
  };

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-center">Painel Admin</h2>
        <p className="text-white/60 mb-8 text-center">Acesso central das funcionalidades do sistema.</p>

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={handleCreateLiveRoom}>
            👑 Criar Sala (Quiz Live)
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={handleSettings}>
            ⚙️ Configurações e API
          </Button>
          <Button variant="secondary" fullWidth onClick={handleOpenLivePlayer}>
            🙋 Abrir fluxo Jogador (Live)
          </Button>
          <Button variant="secondary" fullWidth onClick={handleOpenMonthlyQuiz}>
            📅 Abrir fluxo Quiz Mensal
          </Button>
          <Button variant="secondary" fullWidth onClick={handleOpenResultsPanel}>
            📊 Painel de Resultados
          </Button>
          <Button variant="outline" fullWidth onClick={handleLogout}>
            Sair do Admin
          </Button>
        </div>
      </Card>
    </div>
  );
};
