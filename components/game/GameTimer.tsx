
import React from 'react';

interface GameTimerProps {
  timeLeft: number;
  isUrgent: boolean;
}

export const GameTimer: React.FC<GameTimerProps> = ({ timeLeft, isUrgent }) => {
  return (
    <div className={`
      w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 transition-all duration-300
      ${isUrgent ? 'border-red-500 text-red-500 animate-pulse-fast bg-red-500/10' : 'border-blue-400 text-white bg-blue-500/20'}
    `}>
      {timeLeft}
    </div>
  );
};
