/*
<ai_context>
Defines types for AI-driven quiz generation and persisted quiz structures.
</ai_context>
*/

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "fill_blank"

export type Difficulty = "easy" | "medium" | "hard"

export interface GeneratedOption {
  id: string
  text: string
}

export interface GeneratedQuestion {
  id?: string
  type: QuestionType
  stem: string
  options?: GeneratedOption[]
  answer: string | string[] | boolean | number
  explanation?: string
  tags?: string[]
  order?: number
}

export interface GeneratedQuiz {
  title: string
  difficulty?: Difficulty
  questionCount: number
  questions: GeneratedQuestion[]
}

export interface GenerationParams {
  questionCount: number
  difficulty?: Difficulty
  withExplanations?: boolean
  types?: QuestionType[]
  language?: string
}
