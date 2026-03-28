import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

interface ModeGateProps {
  targetMode: 'live' | 'async';
  children: React.ReactNode;
}

export const ModeGate: React.FC<ModeGateProps> = ({ targetMode, children }) => {
  const { mode, setMode } = useGameStore();

  useEffect(() => {
    if (mode !== targetMode) {
      setMode(targetMode);
    }
  }, [mode, setMode, targetMode]);

  if (mode === 'live' && targetMode === 'live') {
    return <>{children}</>;
  }

  if (mode === 'async' && targetMode === 'async') {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-white/60">Sincronizando modo...</p>
    </div>
  );
};

