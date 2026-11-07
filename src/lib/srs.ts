export interface LessonProgress {
  crowns: 0 | 1 | 2 | 3 | 4 | 5;
  box: 1 | 2 | 3 | 4; // Leitner box (1 = daily review, 4 = mastered)
  lastSeen: string; // ISO date or date key
  nextDue: string; // ISO date YYYY-MM-DD
  attempts: number;
  bestScore: number;
}

export const SRS_INTERVAL_DAYS: Record<number, number> = {
  1: 1, // Review tomorrow
  2: 3, // Review in 3 days
  3: 7, // Review in 1 week
  4: 21, // Review in 3 weeks
};

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeNextProgress(
  prev: LessonProgress | undefined,
  scorePct: number // 0 to 100
): LessonProgress {
  const today = getTodayKey();
  const attempts = (prev?.attempts ?? 0) + 1;
  const bestScore = Math.max(prev?.bestScore ?? 0, scorePct);

  // Compute crowns (0-5)
  let crowns: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  if (scorePct >= 100) crowns = 5;
  else if (scorePct >= 80) crowns = 4;
  else if (scorePct >= 60) crowns = 3;
  else if (scorePct >= 40) crowns = 2;
  else if (scorePct > 0) crowns = 1;

  // Spaced Repetition Box update:
  // If score >= 80%: promote to next box (max 4)
  // If score < 60%: demote to box 1
  let currentBox = prev?.box ?? 1;
  if (scorePct >= 80) {
    currentBox = Math.min(4, currentBox + 1) as 1 | 2 | 3 | 4;
  } else if (scorePct < 60) {
    currentBox = 1;
  }

  const interval = SRS_INTERVAL_DAYS[currentBox] ?? 1;
  const nextDue = addDays(today, interval);

  return {
    crowns: Math.max(prev?.crowns ?? 0, crowns) as 0 | 1 | 2 | 3 | 4 | 5,
    box: currentBox as 1 | 2 | 3 | 4,
    lastSeen: today,
    nextDue,
    attempts,
    bestScore,
  };
}

export function isItemDueForReview(nextDue: string, today: string = getTodayKey()): boolean {
  return nextDue <= today;
}

