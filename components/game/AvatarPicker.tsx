
import React from 'react';

const EMOJIS = ['😎', '🤩', '🧠', '🔥', '🐱', '🐶', '🐼', '🦄', '🚀', '🎸', '🕹️', '🎨'];

interface AvatarPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={`text-2xl p-3 rounded-xl transition-all ${
            selected === emoji 
              ? 'bg-blue-500/40 border-2 border-blue-400 scale-110 shadow-lg' 
              : 'glass hover:bg-white/10 border-2 border-transparent'
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
