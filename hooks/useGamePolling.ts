
import { useEffect, useRef } from 'react';
import { gameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';

export const useGamePolling = (pin: string | null, isActive: boolean) => {
  const { setGameState } = useGameStore();
  // Fix: Changed NodeJS.Timeout to any to avoid missing namespace error in browser environment
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!pin || !isActive) return;

    const poll = async () => {
      const state = await gameService.getGameState(pin);
      if (state) {
        setGameState(state);
      }
    };

    poll();
    timerRef.current = setInterval(poll, 1500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pin, isActive, setGameState]);
};
