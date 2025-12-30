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
  const { apiUrl, setApiUrl, spreadsheetUrl, setSpreadsheetUrl, clearGame } = useGameStore();
  
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

  const handleFullReset = () => {
    if (confirm("Isso apagará todas as configurações e URLs. Deseja continuar?")) {
      localStorage.clear();
      clearGame();
      window.location.reload();
    }
  };

  const handleValidateApi = async () => {
    if (!localApiUrl) {
      setValidationResult({ status: 'error', message: 'Por favor, insira a URL da API.' });
      return;
    }

    setIsValidating(true);
    setValidationResult({ status: null, message: '' });

    try {
      const result = await gameService.getQuizzes(localApiUrl);
      setValidationResult({ 
        status: 'success', 
        message: `Conectado à planilha "${result.spreadsheetName}"! Encontramos ${result.quizzes.length} quizzes únicos na Coluna A.` 
      });
    } catch (error: any) {
      setValidationResult({ 
        status: 'error', 
        message: 'A URL informada não respondeu corretamente. Verifique se publicou como "Qualquer pessoa".' 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const fullGasCode = `/**
 * BACKEND EAC QUIZ - VERSÃO FINAL (quiz_perguntas)
 * Copie este código e cole no seu Apps Script
 */
function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const QUIZ_SHEET_NAME = 'quiz_perguntas';
  
  let response = { status: 'error', message: 'Ação não encontrada' };

  try {
    const sheet = ss.getSheetByName(QUIZ_SHEET_NAME);
    if (!sheet) throw new Error("Aba '" + QUIZ_SHEET_NAME + "' não encontrada na planilha.");

    if (action === 'getQuizzes') {
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        response = { status: 'success', quizzes: [], spreadsheetName: ss.getName() };
      } else {
        const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        const uniqueNames = [...new Set(data.flat().map(n => n ? n.toString().trim() : "").filter(Boolean))];
        const quizzes = uniqueNames.map(name => ({ id: name, nome: name }));
        response = { status: 'success', quizzes: quizzes, spreadsheetName: ss.getName() };
      }
    }

    if (action === 'createGameSession') {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const targetQuizId = params.quizId;
      const data = sheet.getDataRange().getValues();
      
      const questions = data.slice(1)
        .filter(row => row[0] && row[0].toString().trim() === targetQuizId)
        .map((row, i) => {
          const letraCorreta = (row[7] || "").toString().trim().toUpperCase();
          const corretaIdx = letraCorreta.charCodeAt(0) - 65; // A=0, B=1...

          return {
            id: row[1] || ('q' + i),
            pergunta: row[2],
            opcoes: [row[3], row[4], row[5], row[6]],
            corretaIdx: corretaIdx
          };
        })
        .filter(q => q.opcoes.length === 4 && q.corretaIdx >= 0 && q.corretaIdx <= 3);

      if (questions.length === 0) throw new Error("Nenhuma pergunta válida encontrada para o quiz: " + targetQuizId);

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
      const raw = props.getProperty('game_' + pin);
      response = { status: 'success', gameState: JSON.parse(raw) };
    }

    if (action === 'joinGame') {
      const pin = params.pin;
      const name = params.nome;
      let state = JSON.parse(props.getProperty('game_' + pin));
      if (!state.players[name]) {
        state.players[name] = { id: name, nome: name, avatar: params.avatar, score: 0, correctCount: 0 };
        props.setProperty('game_' + pin, JSON.stringify(state));
      }
      response = { status: 'success', gameState: state, playerId: name };
    }

    if (action === 'startGame') {
      let state = JSON.parse(props.getProperty('game_' + params.pin));
      state.status = 'QUESTION';
      state.questionStartTime = Date.now();
      props.setProperty('game_' + params.pin, JSON.stringify(state));
      response = { status: 'success' };
    }

    if (action === 'submitAnswer') {
      let state = JSON.parse(props.getProperty('game_' + params.pin));
      const q = state.perguntas[state.currentQuestionIndex];
      const isCorrect = parseInt(params.respostaIdx) === q.corretaIdx;
      let points = 0;
      if (isCorrect) {
        const elapsed = (Date.now() - state.questionStartTime) / 1000;
        points = Math.max(500, Math.floor(1000 * (1 - (elapsed / state.tempoPorPergunta))));
        state.players[params.nome].score += points;
        state.players[params.nome].correctCount += 1;
      }
      state.answers[params.nome] = { respostaIdx: parseInt(params.respostaIdx), points: points };
      props.setProperty('game_' + params.pin, JSON.stringify(state));
      response = { status: 'success' };
    }

    if (action === 'nextGameState') {
      let state = JSON.parse(props.getProperty('game_' + params.pin));
      if (state.status === 'QUESTION') {
        state.status = 'ANSWER_REVEAL';
        state.lastCorrectAnswer = state.perguntas[state.currentQuestionIndex].corretaIdx;
        state.lastAnswers = state.answers;
        state.leaderboard = Object.values(state.players).sort((a,b) => b.score - a.score);
      } else if (state.status === 'ANSWER_REVEAL') {
        state.status = 'LEADERBOARD';
      } else if (state.status === 'LEADERBOARD') {
        if (state.currentQuestionIndex < state.perguntas.length - 1) {
          state.currentQuestionIndex++;
          state.status = 'QUESTION';
          state.questionStartTime = Date.now();
          state.answers = {};
        } else { state.status = 'FINAL'; }
      }
      props.setProperty('game_' + params.pin, JSON.stringify(state));
      response = { status: 'success' };
    }
  } catch (err) { response = { status: 'error', message: err.toString() }; }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
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
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest">Conexão Google</h3>
            
            <p className="text-xs text-white/50 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              O sistema agora busca os quizzes da aba <b>quiz_perguntas</b>, agrupando pelo nome na <b>Coluna A</b>.
            </p>

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
                  {isValidating ? 'Validando...' : '🔍 Validar Conexão'}
                </Button>
                <Button variant="outline" onClick={() => setShowScriptHelp(!showScriptHelp)}>
                  📋 Código do Backend
                </Button>
              </div>

              {showScriptHelp && (
                <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/10 animate-in zoom-in">
                  <p className="text-xs text-amber-300 mb-2 font-bold uppercase">Passo a passo:</p>
                  <ol className="text-[10px] text-white/60 space-y-1 mb-4 list-decimal ml-4">
                    <li>No Google Sheets: <b>Extensões &gt; Apps Script</b>.</li>
                    <li>Substitua todo o código existente pelo código abaixo.</li>
                    <li>Clique em <b>Implantar &gt; Nova Implantação</b>.</li>
                    <li>Escolha <b>App da Web</b>. Acesso: <b>Qualquer Pessoa (Anyone)</b>.</li>
                    <li>Copie a URL que termina em <b>/exec</b> e cole acima.</li>
                  </ol>
                  <textarea 
                    readOnly 
                    className="w-full h-32 bg-black/50 text-[9px] font-mono p-2 rounded border border-white/10"
                    value={fullGasCode}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </div>
              )}

              {validationResult.status && (
                <div className={`mt-3 p-4 rounded-xl text-xs font-medium ${
                  validationResult.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {validationResult.message}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-6 border-t border-white/10 space-y-3">
             <Button fullWidth onClick={handleSave} size="lg">Salvar Configurações</Button>
             <button 
                onClick={handleFullReset}
                className="w-full text-[10px] text-red-400/30 hover:text-red-400 transition-colors py-2 uppercase font-bold tracking-widest"
              >
                Apagar Tudo e Resetar App
              </button>
          </div>
        </div>
      </Card>
    </div>
  );
};