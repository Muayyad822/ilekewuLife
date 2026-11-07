export type TrackId = 'arabic' | 'tajweed' | 'fiqh' | 'hadith' | 'seerah' | 'adab';
export type DifficultyTier = 'starter' | 'standard' | 'advanced';
export type QuestionType = 'mcq' | 'match' | 'fill' | 'order' | 'listen';
export type ContentStatus = 'draft' | 'in_review' | 'published';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  arabicPrompt?: string;
  explanation: string;
}

export interface McqQuestion extends BaseQuestion {
  type: 'mcq';
  options: string[];
  correctIndex: number;
}

export interface MatchPairQuestion extends BaseQuestion {
  type: 'match';
  pairs: { left: string; right: string }[];
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill';
  sentenceWithBlank: string; // e.g. "الكَلَامُ هُوَ اللَّفْظُ الـ___"
  options: string[];
  correctAnswer: string;
}

export interface OrderSentenceQuestion extends BaseQuestion {
  type: 'order';
  tokens: string[]; // shuffled words
  correctOrder: string[]; // correctly sequenced words
}

export interface ListenQuestion extends BaseQuestion {
  type: 'listen';
  audioUrl: string;
  options: string[];
  correctIndex: number;
}

export type CourseQuestion =
  | McqQuestion
  | MatchPairQuestion
  | FillBlankQuestion
  | OrderSentenceQuestion
  | ListenQuestion;

export interface CourseLesson {
  id: string;
  trackId: TrackId;
  level: number; // 1, 2, 3, etc.
  unit: number; // Unit within level
  order: number; // 1, 2, 3...
  tier: DifficultyTier;
  title: string;
  arabicTitle: string;
  ustadhName: string;
  ustadhTitle: string;
  chalkboard: {
    arabic: string;
    transliteration: string;
    meaning: string;
    audioUrl?: string;
  };
  keyPoints: {
    heading: string;
    arabicSnippet?: string;
    body: string;
  }[];
  practicalTakeaway: string;
  questionPool: CourseQuestion[];
  prerequisites: string[]; // lesson ids required before taking this
  status: ContentStatus;
  reviewedBy?: string;
}

export interface CourseUnit {
  id: string;
  trackId: TrackId;
  level: number;
  unitNumber: number;
  title: string;
  arabicTitle: string;
  description: string;
  lessons: CourseLesson[];
}

export interface CourseTrack {
  id: TrackId;
  name: string;
  arabicName: string;
  icon: string;
  color: string;
  tagline: string;
  units: CourseUnit[];
}

