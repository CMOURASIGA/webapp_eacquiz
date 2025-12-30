import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { QuizSummary, GameSettings } from '../types/game';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';
import { Tag } from '../components/ui/Tag';

export const HostQuizSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setGamePin, apiUrl, setHostId } = useGameStore();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuizzes = async () => {
    if (!apiUrl) {
      setError('Configuração Ausente: Por favor, insira a URL da API nas Configurações.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await gameService.getQuizzes(apiUrl);
      if (result.quizzes) {
        setQuizzes(result.quizzes);
        setSpreadsheetName(result.spreadsheetName);
      } else {
        setError('Não foi possível carregar a lista de quizzes. Verifique se a aba quiz_perguntas existe.');
      }
    } catch (err: any) {
      setError('Erro de Conexão: ' + err.message);
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
      alert("Erro ao criar sala: " + err.message);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Escolha um Quiz</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-blue-300 opacity-60">Sincronizado com:</p>
            {spreadsheetName ? (
              <Tag color="green">{spreadsheetName}</Tag>
            ) : (
              <span className="text-xs opacity-30 italic">Aguardando conexão...</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            🏠 Início
          </Button>
          <Button variant="outline" size="sm" onClick={loadQuizzes} disabled={loading}>
            {loading ? 'Sincronizando...' : '🔄 Atualizar'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}>
            ⚙️ API
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4 glass rounded-3xl">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-white/40 font-medium">Consultando Coluna A da aba quiz_perguntas...</p>
        </div>
      ) : error ? (
        <Card className="text-center p-12 border-red-500/50">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-6 font-medium">{error}</p>
          <div className="flex justify-center gap-4">
            <Button onClick={loadQuizzes}>Tentar Novamente</Button>
            <Button variant="secondary" onClick={() => navigate('/settings')}>Corrigir Script</Button>
          </div>
        </Card>
      ) : quizzes.length === 0 ? (
        <Card className="text-center p-16">
          <div className="text-5xl mb-6">📂</div>
          <h3 className="text-xl font-bold mb-2">Nenhum Quiz Encontrado</h3>
          <p className="text-white/60 mb-8 max-w-sm mx-auto">
            Conectamos à planilha <b>"{spreadsheetName}"</b>, mas a aba <b>quiz_perguntas</b> parece estar vazia na Coluna A.
          </p>
          <Button variant="secondary" onClick={loadQuizzes}>Atualizar Lista</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="hover:scale-[1.02] transition-all hover:shadow-2xl flex flex-col group border-white/5 hover:border-blue-500/50">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-500/20 p-3 rounded-xl">
                  <span className="text-2xl">📝</span>
                </div>
                <Tag color="blue">Ativo</Tag>
              </div>
              <h3 className="text-xl font-bold mb-4 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{quiz.nome}</h3>
              <p className="text-white/50 mb-8 flex-grow text-sm leading-relaxed">
                Clique para abrir esta sala e gerar um novo código PIN para os jogadores.
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
