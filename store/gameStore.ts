
import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameState } from '../types/game';

interface GameStore {
  role: 'host' | 'player' | null;
  gamePin: string | null;
  playerId: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  gameState: GameState | null;
  apiUrl: string;
  spreadsheetUrl: string;
  hostId: string | null;
  isEnvUrl: boolean;
  setRole: (role: 'host' | 'player' | null) => void;
  setPlayerIdentity: (identity: { id: string; name: string; avatar: string }) => void;
  setGamePin: (pin: string | null) => void;
  setGameState: (state: GameState | null) => void;
  setApiUrl: (url: string) => void;
  setSpreadsheetUrl: (url: string) => void;
  setHostId: (id: string | null) => void;
  clearGame: () => void;
}

const GameContext = createContext<GameStore | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<'host' | 'player' | null>(null);
  const [gamePin, setGamePin] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(localStorage.getItem('eac_host_id'));
  
  // Verifica se existe variável de ambiente (Vercel)
  const envUrl = (import.meta as any).env?.VITE_GAS_API_URL;

  const [apiUrl, setApiUrlState] = useState<string>(() => {
    if (envUrl) return envUrl;
    return localStorage.getItem('eac_api_url') || '';
  });

  const [spreadsheetUrl, setSpreadsheetUrlState] = useState<string>(() => {
    return localStorage.getItem('eac_spreadsheet_url') || '';
  });

  const setApiUrl = (url: string) => {
    if (envUrl) return; // Não permite alterar se vier do ambiente
    localStorage.setItem('eac_api_url', url);
    setApiUrlState(url);
  };

  const setSpreadsheetUrl = (url: string) => {
    localStorage.setItem('eac_spreadsheet_url', url);
    setSpreadsheetUrlState(url);
  };

  const setPlayerIdentity = useCallback((identity: { id: string; name: string; avatar: string }) => {
    setPlayerId(identity.id);
    setPlayerName(identity.name);
    setPlayerAvatar(identity.avatar);
  }, []);

  const clearGame = useCallback(() => {
    setRole(null);
    setGamePin(null);
    setPlayerId(null);
    setPlayerName(null);
    setPlayerAvatar(null);
    setGameState(null);
    setHostId(null);
    localStorage.removeItem('eac_host_id');
  }, []);

  const value: GameStore = {
    role,
    gamePin,
    playerId,
    playerName,
    playerAvatar,
    gameState,
    apiUrl,
    spreadsheetUrl,
    hostId,
    isEnvUrl: !!envUrl,
    setRole,
    setPlayerIdentity,
    setGamePin,
    setGameState,
    setApiUrl,
    setSpreadsheetUrl,
    setHostId: (id) => {
      if (id) localStorage.setItem('eac_host_id', id);
      else localStorage.removeItem('eac_host_id');
      setHostId(id);
    },
    clearGame,
  };

  return React.createElement(GameContext.Provider, { value }, children);
};

export const useGameStore = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGameStore must be used within a GameProvider");
  return context;
};
