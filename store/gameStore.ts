
import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameState } from '../types/game';
import { getOrCreateUserId, getOrCreateUserIdForName, getStoredUserName, saveUserName } from '../utils/userIdentity';

interface GameStore {
  mode: 'live' | 'async';
  role: 'host' | 'player' | null;
  gamePin: string | null;
  playerId: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  userId: string;
  userName: string;
  gameState: GameState | null;
  apiUrl: string;
  spreadsheetUrl: string;
  hostId: string | null;
  isEnvUrl: boolean;
  setMode: (mode: 'live' | 'async') => void;
  setRole: (role: 'host' | 'player' | null) => void;
  setPlayerIdentity: (identity: { id: string; name: string; avatar: string }) => void;
  setGamePin: (pin: string | null) => void;
  setGameState: (state: GameState | null) => void;
  setUserName: (name: string) => void;
  setUserIdentityByName: (name: string) => string;
  setApiUrl: (url: string) => void;
  setSpreadsheetUrl: (url: string) => void;
  setHostId: (id: string | null) => void;
  clearGame: () => void;
}

const GameContext = createContext<GameStore | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'live' | 'async'>('live');
  const [role, setRole] = useState<'host' | 'player' | null>(null);
  const [gamePin, setGamePin] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>(() => getOrCreateUserId());
  const [userNameState, setUserNameState] = useState<string>(() => {
    const stored = getStoredUserName();
    if (stored) return stored;
    return localStorage.getItem('eac_player_name') || '';
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(localStorage.getItem('eac_host_id'));
  
  const API_URL = (globalThis as any)?.process?.env?.NEXT_PUBLIC_API_URL ||
    (import.meta as any).env?.NEXT_PUBLIC_API_URL ||
    (import.meta as any).env?.VITE_GAS_API_URL;

  const [apiUrl, setApiUrlState] = useState<string>(() => {
    if (API_URL) return API_URL;
    return localStorage.getItem('eac_api_url') || '';
  });

  const [spreadsheetUrl, setSpreadsheetUrlState] = useState<string>(() => {
    return localStorage.getItem('eac_spreadsheet_url') || '';
  });

  const setApiUrl = (url: string) => {
    if (API_URL) return; // Não permite alterar se vier do ambiente
    localStorage.setItem('eac_api_url', url);
    setApiUrlState(url);
  };

  const setSpreadsheetUrl = (url: string) => {
    localStorage.setItem('eac_spreadsheet_url', url);
    setSpreadsheetUrlState(url);
  };

  const setUserName = useCallback((name: string) => {
    const normalized = name.trim();
    saveUserName(normalized);
    setUserNameState(normalized);
  }, []);

  const setUserIdentityByName = useCallback((name: string) => {
    const normalized = name.trim();
    if (!normalized) return userId;

    const resolvedUserId = getOrCreateUserIdForName(normalized);
    setUserId(resolvedUserId);
    setUserName(normalized);
    return resolvedUserId;
  }, [setUserName, userId]);

  const setPlayerIdentity = useCallback((identity: { id: string; name: string; avatar: string }) => {
    setPlayerId(identity.id);
    setPlayerName(identity.name);
    setPlayerAvatar(identity.avatar);
    setUserName(identity.name);
  }, [setUserName]);

  const clearGame = useCallback(() => {
    setRole(null);
    setGamePin(null);
    setPlayerId(null);
    setPlayerName(null);
    setPlayerAvatar(null);
    setGameState(null);
    setHostId(null);
    setMode('live');
    localStorage.removeItem('eac_host_id');
  }, []);

  const value: GameStore = {
    mode,
    role,
    gamePin,
    playerId,
    playerName,
    playerAvatar,
    userId,
    userName: userNameState,
    gameState,
    apiUrl,
    spreadsheetUrl,
    hostId,
    isEnvUrl: !!API_URL,
    setMode,
    setRole,
    setPlayerIdentity,
    setGamePin,
    setGameState,
    setUserName,
    setUserIdentityByName,
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
