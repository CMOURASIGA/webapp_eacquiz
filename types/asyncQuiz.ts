export interface AsyncQuestion {
  id: string;
  pergunta: string;
  opcoes: string[];
  corretaIdx: number;
}

export interface AsyncQuiz {
  id: string;
  nome: string;
  perguntas: AsyncQuestion[];
}

export interface AsyncQuizResult {
  total: number;
  acertos: number;
  pontuacao: number;
  respondidas: number;
  quizId?: string;
  quizNome?: string;
  registrationStatus?: 'saved' | 'already_completed' | 'queued';
  registrationMessage?: string;
}

export interface AsyncPrize {
  month: string;
  title: string;
  imageUrl: string;
  sourceUrl?: string;
  updatedAt?: string;
}
