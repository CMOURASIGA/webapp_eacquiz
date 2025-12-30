
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { QuizSummary, GameSettings } from '../types/game';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';

// Fixed: Added React import to resolve React namespace error on line 10
export const HostQuizSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setGamePin, apiUrl, spreadsheetUrl, setHostId } = useGameStore();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuizzes = async () => {
    if (!apiUrl) {
      setError('URL da API não configurada. Vá em Configurações.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const data = await gameService.getQuizzes(apiUrl);
      setQuizzes(data);
    } catch (err: any) {
      setError('Falha ao sincronizar com a planilha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
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
      setHostId(hostId);
      
      navigate(`/host/game/${pin}`);
    } catch (err: any) {
      alert("Erro ao criar sessão: " + err.message);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Escolha um Quiz</h1>
          <p className="text-sm text-blue-300 opacity-60">
            Cada item abaixo corresponde a uma aba da sua planilha Google.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadQuizzes} disabled={loading}>
            {loading ? 'Sincronizando...' : '🔄 Atualizar Lista'}
          </Button>
          {spreadsheetUrl && (
            <Button variant="secondary" size="sm" onClick={() => window.open(spreadsheetUrl, '_blank')}>
              📊 Abrir Planilha
            </Button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4 glass rounded-3xl">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-white/40 font-medium">Lendo abas da planilha...</p>
        </div>
      ) : error ? (
        <Card className="text-center p-12 border-red-500/50">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-6 font-medium">{error}</p>
          <div className="flex justify-center gap-4">
            <Button onClick={loadQuizzes}>Tentar Novamente</Button>
            <Button variant="secondary" onClick={() => navigate('/settings')}>Ajustar API</Button>
          </div>
        </Card>
      ) : quizzes.length === 0 ? (
        <Card className="text-center p-16">
          <div className="text-5xl mb-6">📂</div>
          <h3 className="text-xl font-bold mb-2">Nenhum Quiz Encontrado</h3>
          <p className="text-white/60 mb-8 max-w-sm mx-auto">
            Não encontramos abas na sua planilha. Certifique-se de que sua planilha possui ao menos uma aba com perguntas.
          </p>
          <Button variant="secondary" onClick={() => navigate('/settings')}>Verificar Configurações</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="hover:scale-[1.02] transition-all hover:shadow-2xl flex flex-col group border-white/5 hover:border-blue-500/50">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-500/20 p-3 rounded-xl">
                  <span className="text-2xl">📝</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Planilha Ativa</span>
              </div>
              <h3 className="text-xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{quiz.nome}</h3>
              <p className="text-white/50 mb-8 flex-grow text-sm leading-relaxed">
                Clique abaixo para gerar um novo PIN e começar a projetar as perguntas desta aba.
              </p>
              <Button fullWidth onClick={() => handleSelect(quiz.id)}>
                Iniciar Sala 🚀
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
