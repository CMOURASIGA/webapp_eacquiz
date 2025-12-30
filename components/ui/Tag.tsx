
import React from 'react';

interface TagProps {
  children: React.ReactNode;
  color?: 'blue' | 'amber' | 'green' | 'red' | 'white';
}

export const Tag: React.FC<TagProps> = ({ children, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    white: 'bg-white/10 text-white border-white/20'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
};
