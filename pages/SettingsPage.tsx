
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { GameSettings } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { gameService } from '../services/gameService';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { apiUrl, setApiUrl, spreadsheetUrl, setSpreadsheetUrl } = useGameStore();
  
  const [settings, setSettings] = useLocalStorageState<GameSettings>('eac_settings', {
    tempoPorPergunta: 20,
    modoDeJogo: 'automatico'
  });

  const [localSettings, setLocalSettings] = useState(settings);
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localSpreadsheetUrl, setLocalSpreadsheetUrl] = useState(spreadsheetUrl);
  
  const [isValidating, setIsValidating] = useState(false);
  const [showScriptHelp, setShowScriptHelp] = useState(false);
  const [validationResult, setValidationResult] = useState<{status: 'success' | 'error' | null, message: string}>({
    status: null,
    message: ''
  });

  const handleSave = () => {
    setSettings(localSettings);
    setApiUrl(localApiUrl);
    setSpreadsheetUrl(localSpreadsheetUrl);
    alert("Configurações salvas!");
    navigate('/');
  };

  const handleValidateApi = async () => {
    if (!localApiUrl) {
      setValidationResult({ status: 'error', message: 'Por favor, insira a URL da API antes de testar.' });
      return;
    }

    setIsValidating(true);
    setValidationResult({ status: null, message: '' });

    try {
      const quizzes = await gameService.getQuizzes(localApiUrl);
      setValidationResult({ 
        status: 'success', 
        message: `Conectado! Encontramos ${quizzes.length} quizzes ativos na sua planilha.` 
      });
    } catch (error: any) {
      setValidationResult({ 
        status: 'error', 
        message: error.message || 'Erro ao conectar. Verifique o Script.' 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const gasCode = `/**
 * CÓDIGO PARA GOOGLE APPS SCRIPT - EAC QUIZ
 * Cole este código no editor de script da sua planilha.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let result = { status: 'error', message: 'Ação não encontrada' };

  try {
    if (action === 'getQuizzes') {
      const sheets = ss.getSheets().filter(s => s.getName() !== 'LOGS' && s.getName() !== 'SETTINGS');
      result = { 
        status: 'success', 
        quizzes: sheets.map(s => ({ id: s.getName(), nome: s.getName() })) 
      };
    }
    
    // ... Implementar outras ações (createGameSession, joinGame, etc) conforme a lógica de backend
    // Este é um exemplo simplificado para validar a conexão inicial.
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <Card>
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold">Configurações</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>Voltar</Button>
        </div>
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest">Integração</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">URL da Planilha</label>
              <input 
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={localSpreadsheetUrl}
                onChange={(e) => setLocalSpreadsheetUrl(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">URL da API (Apps Script)</label>
              <input 
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={localApiUrl}
                onChange={(e) => {
                  setLocalApiUrl(e.target.value);
                  setValidationResult({ status: null, message: '' });
                }}
                className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                  validationResult.status === 'success' ? 'border-green-500/50' : 
                  validationResult.status === 'error' ? 'border-red-500/50' : 'border-white/20'
                }`}
              />
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  variant={validationResult.status === 'success' ? 'success' : 'secondary'}
                  onClick={handleValidateApi}
                  disabled={isValidating || !localApiUrl}
                >
                  {isValidating ? 'Testando...' : '🔍 Testar Conexão'}
                </Button>
                <Button variant="outline" onClick={() => setShowScriptHelp(!showScriptHelp)}>
                  📄 Ver Código do Script
                </Button>
              </div>

              {showScriptHelp && (
                <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/10 animate-in fade-in zoom-in duration-300">
                  <p className="text-xs text-amber-200 mb-3 font-bold">⚠️ Importante:</p>
                  <ol className="text-[10px] text-white/60 space-y-1 mb-4 list-decimal ml-4">
                    <li>Abra sua planilha -> Extensões -> Apps Script.</li>
                    <li>Cole o código completo do backend.</li>
                    <li>Clique em Implantar -> Nova Implantação.</li>
                    <li>Tipo: "App da Web", Quem tem acesso: "Qualquer pessoa" (Anyone).</li>
                  </ol>
                  <pre className="text-[9px] font-mono bg-black/50 p-2 rounded border border-white/5 overflow-x-auto max-h-40">
                    {gasCode}
                  </pre>
                </div>
              )}

              {validationResult.status && (
                <div className={`mt-3 p-4 rounded-xl text-sm ${
                  validationResult.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  <p className="font-bold">{validationResult.status === 'success' ? 'Conectado!' : 'Falha na conexão'}</p>
                  <p className="opacity-80 text-xs mt-1">{validationResult.message}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-6">
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest">Jogo</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tempo (seg)</label>
                <input 
                  type="number"
                  value={localSettings.tempoPorPergunta}
                  onChange={(e) => setLocalSettings({...localSettings, tempoPorPergunta: Number(e.target.value)})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Avanço</label>
                <select 
                  value={localSettings.modoDeJogo}
                  onChange={(e) => setLocalSettings({...localSettings, modoDeJogo: e.target.value as any})}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="automatico">🤖 Auto</option>
                  <option value="manual">🖱️ Manual</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Button fullWidth onClick={handleSave} size="lg">Salvar Configurações</Button>
        </div>
      </Card>
    </div>
  );
};
