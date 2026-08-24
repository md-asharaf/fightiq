export interface Document {
  id: string;
  title: string;
  content?: string;
  source: string;
  category: string;
  created_at: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  sources?: string[];
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
  is_correct: boolean;
  selected_option_id: string | null;
  correct_option_id: string;
  explanation: string;
}

export interface QuizResult {
  session_id: string;
  score: number;
  total_questions: number;
  score_percentage: number;
  results: QuizEvaluation[];
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
  source?: string;
  category?: string;
}

export interface ChatMessageData {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}
export interface ChatSessionPreview {
  session_id: string;
  created_at: string;
  preview_text: string;
}
