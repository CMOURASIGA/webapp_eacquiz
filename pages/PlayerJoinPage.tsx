
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AvatarPicker } from '../components/game/AvatarPicker';
import { gameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';
import { isValidPin, isValidName } from '../utils/validation';

export const PlayerJoinPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setPlayerIdentity, setGamePin } = useGameStore();
  
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPin(pin)) return setError('PIN deve ter 4 dígitos');
    if (!isValidName(name)) return setError('Nome deve ter entre 2 e 15 caracteres');

    setLoading(true);
    try {
      const { gameState, playerId } = await gameService.joinGame(pin, name, avatar);
      
      setRole('player');
      setGamePin(pin);
      setPlayerIdentity({ id: playerId, name, avatar });

      localStorage.setItem('eac_player_id', playerId);
      localStorage.setItem('eac_player_name', name);
      localStorage.setItem('eac_player_avatar', avatar);
      localStorage.setItem('eac_last_pin', pin);

      navigate(`/player/game/${pin}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar na sala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h2 className="text-2xl font-bold mb-6 text-center">Entrar no EAC Quiz</h2>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">PIN da Sala</label>
            <input 
              type="text"
              maxLength={4}
              placeholder="0000"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-center text-4xl font-black tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Seu Nome</label>
            <input 
              type="text"
              placeholder="Como quer ser chamado?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Escolha seu Avatar</label>
            <AvatarPicker selected={avatar} onSelect={setAvatar} />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="pt-4 flex gap-3">
             <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/')}>Voltar</Button>
             <Button type="submit" fullWidth disabled={loading}>
               {loading ? 'Entrando...' : '🚀 Entrar'}
             </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
