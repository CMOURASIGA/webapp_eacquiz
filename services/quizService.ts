
import { Quiz } from '../types/game';

const MOCK_QUIZZES: Quiz[] = [
  {
    id: 'culture-eac',
    nome: 'Cultura e Valores EAC',
    perguntas: [
      {
        id: 'q1',
        pergunta: 'Qual é o principal valor da EAC?',
        opcoes: ['Inovação', 'Foco no Cliente', 'Trabalho em Equipe', 'Excelência'],
        corretaIdx: 1,
      },
      {
        id: 'q2',
        pergunta: 'Em que ano a EAC foi fundada?',
        opcoes: ['2010', '2015', '2018', '2020'],
        corretaIdx: 2,
      },
      {
        id: 'q3',
        pergunta: 'Qual a cor principal da nossa marca?',
        opcoes: ['Verde', 'Vermelho', 'Azul', 'Laranja'],
        corretaIdx: 2,
      }
    ]
  },
  {
    id: 'tech-general',
    nome: 'Conhecimentos Gerais Tech',
    perguntas: [
      {
        id: 't1',
        pergunta: 'O que significa a sigla HTML?',
        opcoes: ['HyperText Markup Language', 'High Tech Modern Language', 'Hyperlink Text Main Line', 'HyperTool Multi Language'],
        corretaIdx: 0,
      },
      {
        id: 't2',
        pergunta: 'Qual empresa criou o React?',
        opcoes: ['Google', 'Meta', 'Amazon', 'Microsoft'],
        corretaIdx: 1,
      }
    ]
  },
  {
    id: 'history-brasil',
    nome: 'História do Brasil',
    perguntas: [
      {
        id: 'h1',
        pergunta: 'Quem descobriu o Brasil?',
        opcoes: ['Cristóvão Colombo', 'Pedro Álvares Cabral', 'Vasco da Gama', 'Américo Vespúcio'],
        corretaIdx: 1,
      }
    ]
  }
];

export const quizService = {
  getQuizzes: async (): Promise<Quiz[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_QUIZZES), 500);
    });
  },
  getQuizById: async (id: string): Promise<Quiz | null> => {
    return MOCK_QUIZZES.find(q => q.id === id) || null;
  }
};
