
import React from 'react';

interface QuestionOptionsGridProps {
  options: string[];
  onSelect?: (idx: number) => void;
  selectedIndex?: number | null;
  correctIndex?: number | null;
  disabled?: boolean;
  reveal?: boolean;
}

export const QuestionOptionsGrid: React.FC<QuestionOptionsGridProps> = ({ 
  options, 
  onSelect, 
  selectedIndex, 
  correctIndex,
  disabled = false,
  reveal = false
}) => {
  const colors = [
    'bg-red-500 hover:bg-red-400',
    'bg-blue-500 hover:bg-blue-400',
    'bg-amber-500 hover:bg-amber-400',
    'bg-green-500 hover:bg-green-400',
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((opt, idx) => {
        const isSelected = selectedIndex === idx;
        const isCorrect = correctIndex === idx;
        
        let statusClasses = "";
        if (reveal) {
          if (isCorrect) statusClasses = "ring-4 ring-green-400 border-green-400 z-10 scale-105";
          else if (isSelected) statusClasses = "opacity-50 ring-4 ring-red-500";
          else statusClasses = "opacity-30 grayscale";
        } else if (isSelected) {
          statusClasses = "ring-4 ring-white scale-105 shadow-2xl";
        }

        return (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onSelect?.(idx)}
            className={`
              relative p-6 rounded-2xl text-left text-xl font-bold text-white transition-all min-h-[100px] flex items-center
              ${colors[idx % 4]} ${statusClasses}
              ${disabled ? 'cursor-default' : 'active:scale-95'}
            `}
          >
            <span className="mr-4 opacity-50 text-2xl">
              {idx === 0 && '▲'}
              {idx === 1 && '◆'}
              {idx === 2 && '●'}
              {idx === 3 && '■'}
            </span>
            {opt}
            {reveal && isCorrect && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl">✅</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
