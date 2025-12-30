
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  heavy?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', heavy = false }) => {
  return (
    <div className={`${heavy ? 'glass-heavy' : 'glass'} rounded-2xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
};
