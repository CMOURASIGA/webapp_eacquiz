
import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameState } from '../types/game';

interface GameStore {
  role: 'host' | 'player' | null;
  gamePin: string | null;
  playerId: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  gameState: GameState | null;
  setRole: (role: 'host' | 'player' | null) => void;
  setPlayerIdentity: (identity: { id: string; name: string; avatar: string }) => void;
  setGamePin: (pin: string | null) => void;
  setGameState: (state: GameState | null) => void;
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
  }, []);

  const value: GameStore = {
    role,
    gamePin,
    playerId,
    playerName,
    playerAvatar,
    gameState,
    setRole,
    setPlayerIdentity,
    setGamePin,
    setGameState,
    clearGame,
  };

  // Fix: Replaced JSX with React.createElement to avoid parsing errors in .ts file
  return React.createElement(GameContext.Provider, { value }, children);
};

export const useGameStore = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGameStore must be used within a GameProvider");
  return context;
};
