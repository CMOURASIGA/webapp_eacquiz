import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Carregando...', size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-6 h-6 border-2' : size === 'lg' ? 'w-12 h-12 border-4' : 'w-10 h-10 border-4';

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClass} animate-spin border-blue-500 border-t-transparent rounded-full`} />
      <p className="text-white/60">{label}</p>
    </div>
  );
};

