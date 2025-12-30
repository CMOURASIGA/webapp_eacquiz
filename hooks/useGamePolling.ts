
import { useEffect, useRef } from 'react';
import { gameService } from '../services/gameService';
import { useGameStore } from '../store/gameStore';

export const useGamePolling = (pin: string | null, isActive: boolean) => {
  const { setGameState, apiUrl } = useGameStore();
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!pin || !isActive || !apiUrl) return;

    const poll = async () => {
      const state = await gameService.getGameState(apiUrl, pin);
      if (state) {
        setGameState(state);
      }
    };

    poll();
    timerRef.current = setInterval(poll, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pin, isActive, apiUrl, setGameState]);
};
