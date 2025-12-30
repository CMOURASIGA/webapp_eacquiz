
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
      setValidationResult({ status: 'error', message: 'Por favor, insira a URL da API.' });
      return;
    }

    setIsValidating(true);
    setValidationResult({ status: null, message: '' });

    try {
      const quizzes = await gameService.getQuizzes(localApiUrl);
      setValidationResult({ 
        status: 'success', 
        message: `Conectado! Encontramos ${quizzes.length} abas na sua planilha.` 
      });
    } catch (error: any) {
      setValidationResult({ 
        status: 'error', 
        message: error.message 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const fullGasCode = `/**
 * BACKEND COMPLETO - EAC QUIZ
 * Cole este código integralmente no seu editor Apps Script.
 */

const CACHE_TIME = 21600; // 6 horas

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  
  let response = { status: 'error', message: 'Ação desconhecida' };

  try {
    if (action === 'getQuizzes') {
      const sheets = ss.getSheets();
      const quizzes = sheets.map(s => ({ id: s.getName(), nome: s.getName() }));
      response = { status: 'success', quizzes: quizzes };
    }

    if (action === 'createGameSession') {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const quizId = params.quizId;
      const sheet = ss.getSheetByName(quizId);
      const data = sheet.getDataRange().getValues();
      const questions = data.slice(1).map((row, i) => ({
        id: 'q' + i,
        pergunta: row[0],
        opcoes: [row[1], row[2], row[3], row[4]],
        corretaIdx: parseInt(row[5]) - 1
      }));

      const hostId = "host_" + Date.now();
      const state = {
        pin: pin,
        hostId: hostId,
        status: 'LOBBY',
        perguntas: questions,
        currentQuestionIndex: 0,
        players: {},
        tempoPorPergunta: parseInt(params.tempoPorPergunta || 20),
        modoDeJogo: params.modoDeJogo || 'automatico',
        questionStartTime: 0,
        answers: {},
        lastAnswers: {},
        lastCorrectAnswer: -1,
        leaderboard: []
      };

      props.setProperty('game_' + pin, JSON.stringify(state));
      response = { status: 'success', pin: pin, hostId: hostId };
    }

    if (action === 'getGameState') {
      const pin = params.pin;
      const state = JSON.parse(props.getProperty('game_' + pin));
      response = { status: 'success', gameState: state };
    }

    if (action === 'joinGame') {
      const pin = params.pin;
      const name = params.nome;
      const avatar = params.avatar;
      let state = JSON.parse(props.getProperty('game_' + pin));
      
      if (!state.players[name]) {
        state.players[name] = { id: name, nome: name, avatar: avatar, score: 0, correctCount: 0 };
        props.setProperty('game_' + pin, JSON.stringify(state));
      }
      response = { status: 'success', gameState: state, playerId: name };
    }

    if (action === 'startGame') {
      const pin = params.pin;
      let state = JSON.parse(props.getProperty('game_' + pin));
      state.status = 'QUESTION';
      state.questionStartTime = Date.now();
      props.setProperty('game_' + pin, JSON.stringify(state));
      response = { status: 'success' };
    }

    if (action === 'submitAnswer') {
      const pin = params.pin;
      const name = params.nome;
      const idx = parseInt(params.respostaIdx);
      let state = JSON.parse(props.getProperty('game_' + pin));
      
      const question = state.perguntas[state.currentQuestionIndex];
      const isCorrect = idx === question.corretaIdx;
      let points = 0;
      
      if (isCorrect) {
        const timeElapsed = (Date.now() - state.questionStartTime) / 1000;
        points = Math.max(500, Math.floor(1000 * (1 - (timeElapsed / state.tempoPorPergunta))));
        state.players[name].score += points;
        state.players[name].correctCount += 1;
      }
      
      state.answers[name] = { respostaIdx: idx, points: points };
      props.setProperty('game_' + pin, JSON.stringify(state));
      response = { status: 'success' };
    }

    if (action === 'nextGameState') {
      const pin = params.pin;
      let state = JSON.parse(props.getProperty('game_' + pin));
      
      if (state.status === 'QUESTION') {
        state.status = 'ANSWER_REVEAL';
        state.lastCorrectAnswer = state.perguntas[state.currentQuestionIndex].corretaIdx;
        state.lastAnswers = state.answers;
        
        const sorted = Object.values(state.players).sort((a,b) => b.score - a.score);
        state.leaderboard = sorted.map(p => ({
          playerId: p.id, nome: p.nome, avatar: p.avatar, score: p.score, correctCount: p.correctCount
        }));
      } else if (state.status === 'ANSWER_REVEAL') {
        state.status = 'LEADERBOARD';
      } else if (state.status === 'LEADERBOARD') {
        if (state.currentQuestionIndex < state.perguntas.length - 1) {
          state.currentQuestionIndex++;
          state.status = 'QUESTION';
          state.questionStartTime = Date.now();
          state.answers = {};
        } else {
          state.status = 'FINAL';
        }
      }
      
      props.setProperty('game_' + pin, JSON.stringify(state));
      response = { status: 'success' };
    }

  } catch (err) {
    response = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <Card>
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold">Configurações</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>Voltar</Button>
        </div>
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest">Conexão Google</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">URL da Planilha</label>
              <input 
                type="text"
                value={localSpreadsheetUrl}
                onChange={(e) => setLocalSpreadsheetUrl(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 opacity-80">URL da API (Apps Script)</label>
              <input 
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={localApiUrl}
                onChange={(e) => setLocalApiUrl(e.target.value)}
                className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-sm font-mono ${
                  validationResult.status === 'success' ? 'border-green-500' : 
                  validationResult.status === 'error' ? 'border-red-500' : 'border-white/20'
                }`}
              />
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  variant={validationResult.status === 'success' ? 'success' : 'secondary'}
                  onClick={handleValidateApi}
                  disabled={isValidating || !localApiUrl}
                >
                  {isValidating ? 'Validando...' : '🔍 Validar Agora'}
                </Button>
                <Button variant="outline" onClick={() => setShowScriptHelp(!showScriptHelp)}>
                  📋 Copiar Código Backend
                </Button>
              </div>

              {showScriptHelp && (
                <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/10 animate-in zoom-in">
                  <p className="text-xs text-amber-300 mb-2 font-bold">Como configurar:</p>
                  <ol className="text-[10px] text-white/60 space-y-1 mb-4 list-decimal ml-4">
                    <li>Abra sua planilha -> Extensões -> Apps Script.</li>
                    <li>Apague tudo e cole o código abaixo.</li>
                    <li>Clique em <b>Implantar > Nova Implantação</b>.</li>
                    <li>Tipo: <b>App da Web</b>.</li>
                    <li>Quem tem acesso: <b>Qualquer pessoa (Anyone)</b>. <span className="text-red-400 underline">Importante!</span></li>
                  </ol>
                  <textarea 
                    readOnly 
                    className="w-full h-32 bg-black/50 text-[9px] font-mono p-2 rounded border border-white/10"
                    value={fullGasCode}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <p className="text-[10px] mt-2 opacity-50">Dica: Após salvar e implantar, use a URL que termina em <b>/exec</b>.</p>
                </div>
              )}

              {validationResult.status && (
                <div className={`mt-3 p-4 rounded-xl text-xs ${
                  validationResult.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {validationResult.message}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-6 border-t border-white/10">
             <Button fullWidth onClick={handleSave} size="lg">Gravar Configurações</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
