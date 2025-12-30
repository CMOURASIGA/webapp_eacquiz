
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Tag } from '../ui/Tag';

export const Header: React.FC = () => {
  const { role, playerName, playerAvatar, gamePin } = useGameStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center px-4 md:px-8 justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white">E</div>
        <h1 className="text-xl font-bold tracking-tight">EAC <span className="text-blue-400">Quiz</span></h1>
      </div>

      <div className="flex items-center gap-3">
        {gamePin && (
          <Tag color="amber">PIN: {gamePin}</Tag>
        )}
        
        {role === 'host' && (
          <Tag color="white">👑 Anfitrião</Tag>
        )}

        {role === 'player' && playerName && (
          <Tag color="blue">
            <span className="mr-1">{playerAvatar}</span> {playerName}
          </Tag>
        )}
      </div>
    </header>
  );
};
