
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { GameSettings } from '../types/game';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useLocalStorageState<GameSettings>('eac_settings', {
    tempoPorPergunta: 20,
    modoDeJogo: 'automatico'
  });

  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    setSettings(localSettings);
    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h2 className="text-2xl font-bold mb-6">Configurações</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Tempo por Pergunta (segundos)</label>
            <input 
              type="number"
              min="10"
              max="120"
              value={localSettings.tempoPorPergunta}
              onChange={(e) => setLocalSettings({...localSettings, tempoPorPergunta: Number(e.target.value)})}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Modo de Avanço</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalSettings({...localSettings, modoDeJogo: 'automatico'})}
                className={`p-3 rounded-xl border-2 transition-all ${localSettings.modoDeJogo === 'automatico' ? 'bg-blue-500/40 border-blue-400' : 'bg-white/5 border-transparent'}`}
              >
                🤖 Automático
              </button>
              <button
                onClick={() => setLocalSettings({...localSettings, modoDeJogo: 'manual'})}
                className={`p-3 rounded-xl border-2 transition-all ${localSettings.modoDeJogo === 'manual' ? 'bg-blue-500/40 border-blue-400' : 'bg-white/5 border-transparent'}`}
              >
                🖱️ Manual
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <Button variant="secondary" fullWidth onClick={() => navigate('/')}>Cancelar</Button>
          <Button fullWidth onClick={handleSave}>Salvar</Button>
        </div>
      </Card>
    </div>
  );
};
