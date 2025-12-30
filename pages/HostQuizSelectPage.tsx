
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { Quiz, GameSettings } from '../types/game';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/gameStore';

export const HostQuizSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setGamePin } = useGameStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameService.getQuizzes().then(data => {
      setQuizzes(data as any);
      setLoading(false);
    });
  }, []);

  const handleSelect = async (quizId: string) => {
    const savedSettings = localStorage.getItem('eac_settings');
    const settings: GameSettings = savedSettings ? JSON.parse(savedSettings) : {
      tempoPorPergunta: 20,
      modoDeJogo: 'automatico'
    };

    const { pin } = await gameService.createGameSession(quizId, settings);
    setRole('host');
    setGamePin(pin);
    navigate(`/host/game/${pin}`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold">Escolha um Quiz</h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          ← Voltar ao Início
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="hover:scale-[1.02] transition-transform flex flex-col">
              <h3 className="text-xl font-bold mb-4">{quiz.nome}</h3>
              <p className="text-white/60 mb-6 flex-grow">{quiz.perguntas.length} Perguntas disponíveis.</p>
              <Button fullWidth onClick={() => handleSelect(quiz.id)}>
                Selecionar
              </Button>
            </Card>
          ))}
        </div>
      )}

      {!loading && quizzes.length === 0 && (
        <Card className="text-center p-12">
          <p className="text-white/60">Nenhum quiz encontrado.</p>
        </Card>
      )}
    </div>
  );
};
