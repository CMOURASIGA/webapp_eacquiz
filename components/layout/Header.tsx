
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Tag } from '../ui/Tag';
import { useNavigate } from 'react-router-dom';
import { APP_BRAND_TEXT_HIGHLIGHT, APP_BRAND_TEXT_PRIMARY, APP_BRAND_TITLE, APP_LOGO_FALLBACK_URL, APP_LOGO_URL } from '../../utils/branding';

export const Header: React.FC = () => {
  const { mode, role, playerName, playerAvatar, gamePin } = useGameStore();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center px-4 md:px-8 justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => navigate('/')}
      >
        <img 
          src={APP_LOGO_URL}
          alt={`${APP_BRAND_TITLE} Logo`}
          className="w-10 h-10 object-contain rounded"
          onError={(e) => {
            (e.target as any).src = APP_LOGO_FALLBACK_URL;
          }}
        />
        <h1 className="text-xl font-bold tracking-tight">
          {APP_BRAND_TEXT_PRIMARY} <span className="text-blue-400">{APP_BRAND_TEXT_HIGHLIGHT}</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {mode === 'live' && (
          <>
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
          </>
        )}

        {mode === 'async' && (
          <Tag color="green">⚡ Quiz Async</Tag>
        )}
      </div>
    </header>
  );
};
