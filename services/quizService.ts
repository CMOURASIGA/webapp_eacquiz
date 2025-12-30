
import { QuizSummary } from '../types/game';

// Dados mockados removidos. 
// O app agora consome diretamente do gameService que acessa o Google Sheets.

export const quizService = {
  // Mantemos a interface vazia ou apenas com métodos de auxílio se necessário no futuro
  formatQuizName: (name: string) => name.trim(),
};
