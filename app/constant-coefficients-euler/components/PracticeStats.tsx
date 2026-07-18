import type { QuizSessionStats } from "../types";

export function PracticeStats({ stats }: { stats: QuizSessionStats }) {
  const percent = stats.answered === 0 ? 0 : Math.round((100 * stats.correct) / stats.answered);
  return (
    <div className="quiz-stats" aria-label="סטטיסטיקת תרגול">
      <span>שאלות: {stats.answered}</span>
      <span>הושלמו בנפרד: {stats.correct}</span>
      <span>דיוק: {percent}%</span>
      <span>רצף: {stats.currentStreak}</span>
      <span>שיא רצף: {stats.bestStreak}</span>
    </div>
  );
}
