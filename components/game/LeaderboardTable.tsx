
import React from 'react';
import { LeaderboardEntry } from '../../types/game';
import { Card } from '../ui/Card';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightId?: string | null;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries, highlightId }) => {
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/5">
          <tr>
            <th className="p-4 font-bold text-blue-400">#</th>
            <th className="p-4 font-bold text-blue-400">Jogador</th>
            <th className="p-4 font-bold text-blue-400 text-right">Acertos</th>
            <th className="p-4 font-bold text-blue-400 text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr 
              key={entry.playerId} 
              className={`border-t border-white/5 transition-colors ${entry.playerId === highlightId ? 'bg-blue-500/20' : ''}`}
            >
              <td className="p-4 font-semibold opacity-60">{idx + 1}</td>
              <td className="p-4 font-medium flex items-center gap-3">
                <span className="text-xl">{entry.avatar}</span>
                {entry.nome}
              </td>
              <td className="p-4 text-right">{entry.correctCount}</td>
              <td className="p-4 text-right font-bold text-blue-300">{entry.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};
