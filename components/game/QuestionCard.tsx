
import React from 'react';
import { Card } from '../ui/Card';

interface QuestionCardProps {
  text: string;
  index: number;
  total: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ text, index, total }) => {
  return (
    <Card className="text-center mb-8" heavy>
      <p className="text-blue-400 font-semibold mb-2">Pergunta {index + 1} de {total}</p>
      <h2 className="text-2xl md:text-3xl font-bold">{text}</h2>
    </Card>
  );
};
