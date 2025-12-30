
import React from 'react';
import { LeaderboardEntry } from '../../types/game';

interface PodiumProps {
  entries: LeaderboardEntry[];
}

export const Podium: React.FC<PodiumProps> = ({ entries }) => {
  const top3 = entries.slice(0, 3);
  
  // Custom order for podium visualization: 2nd, 1st, 3rd
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2, height: 'h-48' });
  if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1, height: 'h-64' });
  if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3, height: 'h-32' });

  return (
    <div className="flex items-end justify-center gap-4 md:gap-8 mt-12 mb-8">
      {podiumOrder.map((player) => (
        <div key={player.playerId} className="flex flex-col items-center flex-1 max-w-[150px]">
          <div className="mb-4 text-center">
            <div className="text-4xl mb-2">{player.avatar}</div>
            <div className="font-bold truncate w-full">{player.nome}</div>
            <div className="text-sm opacity-60">{player.score} pts</div>
          </div>
          <div className={`
            w-full ${player.height} glass-heavy rounded-t-2xl flex flex-col items-center justify-start p-4
            ${player.rank === 1 ? 'border-amber-400 border-t-4' : 'border-white/20 border-t-2'}
          `}>
            <div className="text-3xl font-black opacity-30">
              {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
            </div>
            <div className="mt-2 font-bold text-2xl">{player.rank}º</div>
          </div>
        </div>
      ))}
    </div>
  );
};
