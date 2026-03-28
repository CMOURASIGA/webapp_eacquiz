interface CalculateScoreInput {
  correta: boolean;
  tempo: number;
}

const MIN_CORRECT_SCORE = 500;
const MAX_SCORE = 1000;

export const calculateScore = ({ correta, tempo }: CalculateScoreInput): number => {
  if (!correta) return 0;

  const normalizedTempo = Math.max(0, Math.min(1, Number(tempo) || 0));
  const scoreBySpeed = Math.floor(MAX_SCORE * (1 - normalizedTempo));
  return Math.max(MIN_CORRECT_SCORE, scoreBySpeed);
};

