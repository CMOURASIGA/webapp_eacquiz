
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { Quiz, GameSettings } from '../types/game';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';

export const HostQuizSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setGamePin, apiUrl, spreadsheetUrl, setHostId } = useGameStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiUrl) {
      setError('URL da API não configurada. Vá em Configurações.');
      setLoading(false);
      return;
    }

    gameService.getQuizzes(apiUrl)
      .then(data => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Erro ao carrergar quizzes: ' + err.message);
        setLoading(false);
      });
  }, [apiUrl]);

  const handleSelect = async (quizId: string) => {
    try {
      const savedSettings = localStorage.getItem('eac_settings');
      const settings: GameSettings = savedSettings ? JSON.parse(savedSettings) : {
        tempoPorPergunta: 20,
        modoDeJogo: 'automatico'
      };

      const { pin, hostId } = await gameService.createGameSession(apiUrl, quizId, settings);
      
      setRole('host');
      setGamePin(pin);
      setHostId(hostId); // Importante para o anfitrião controlar o jogo
      
      navigate(`/host/game/${pin}`);
    } catch (err: any) {
      alert("Erro ao criar sessão: " + err.message);
    }
  };

  const handleOpenSpreadsheet = () => {
    if (spreadsheetUrl) {
      window.open(spreadsheetUrl, '_blank');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Escolha um Quiz</h1>
          <p className="text-sm text-blue-300 opacity-60">Os dados abaixo são sincronizados da planilha Google.</p>
        </div>
        
        <div className="flex gap-2">
          {spreadsheetUrl && (
            <Button variant="secondary" size="sm" onClick={handleOpenSpreadsheet}>
              📊 Abrir Planilha
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            ← Início
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-white/40">Sincronizando com Google Sheets...</p>
        </div>
      ) : error ? (
        <Card className="text-center p-12 border-red-500/50">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => navigate('/settings')}>Ir para Configurações</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="hover:scale-[1.02] transition-transform flex flex-col group">
              <h3 className="text-xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{quiz.nome}</h3>
              <p className="text-white/60 mb-6 flex-grow text-sm">Esta sala carregará as perguntas definidas na aba <strong>'{quiz.nome}'</strong> da planilha.</p>
              <Button fullWidth onClick={() => handleSelect(quiz.id)}>
                Iniciar Sala
              </Button>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <Card className="text-center p-12">
          <p className="text-white/60">Nenhum quiz encontrado na planilha vinculada.</p>
          <p className="text-xs opacity-40 mt-2">Verifique se as abas estão nomeadas corretamente.</p>
        </Card>
      )}
    </div>
  );
};
