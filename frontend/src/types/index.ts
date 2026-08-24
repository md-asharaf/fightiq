export interface Document {
  id: string;
  title: string;
  content?: string;
  source: string;
  category: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  session_id: string;
  question_text: string;
  choices: string[];
}

export interface QuizSession {
  id: string;
  topic: string;
  difficulty: string;
  status: "active" | "completed";
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizEvaluation {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  score: number;
  explanation: string;
}

export interface QuizResult {
  session_id: string;
  evaluations: QuizEvaluation[];
  total_score: number;
  max_score: number;
  created_at: string;
}

export interface EvalMetrics {
  faithfulness?: number | null;
  answer_relevancy?: number | null;
  context_precision?: number | null;
  context_recall?: number | null;
}

export interface EvalRun {
  id: string;
  metrics: EvalMetrics;
  created_at: string;
}

export interface ChatSource {
  source_id: string;
  title: string;
}

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}
