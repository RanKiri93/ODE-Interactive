import type {
  EulerTransformationExerciseState,
  FullSolutionExerciseState,
  QuizSessionStats,
  ReconstructionExerciseState,
} from "../types";

export function createInitialExerciseState(): FullSolutionExerciseState {
  return {
    polynomialStatus: "unanswered",
    rootsStatus: "locked",
    basisStatus: "locked",
    initialConditionsStatus: "locked",
    stabilityStatus: "locked",
    rootsEverUnlocked: false,
    basisEverUnlocked: false,
    initialConditionsEverUnlocked: false,
    stabilityEverUnlocked: false,
    usedReveal: false,
    completed: false,
    completionKind: "none",
  };
}

export function createInitialEulerExerciseState(): EulerTransformationExerciseState {
  return {
    polynomialStatus: "unanswered",
    transformedEquationStatus: "locked",
    rootsStatus: "locked",
    uBasisStatus: "locked",
    yBasisStatus: "locked",
    stabilityStatus: "locked",
    transformedEquationEverUnlocked: false,
    rootsEverUnlocked: false,
    uBasisEverUnlocked: false,
    yBasisEverUnlocked: false,
    stabilityEverUnlocked: false,
    usedReveal: false,
    completed: false,
    completionKind: "none",
  };
}

export function createInitialReconstructionExerciseState(): ReconstructionExerciseState {
  return {
    feasibilityStatus: "unanswered",
    infeasibilityReasonStatus: "locked",
    forcedRootsStatus: "locked",
    outcomeStatus: "locked",
    conclusionStatus: "locked",
    infeasibilityReasonEverUnlocked: false,
    forcedRootsEverUnlocked: false,
    outcomeEverUnlocked: false,
    conclusionEverUnlocked: false,
    usedReveal: false,
    completed: false,
    completionKind: "none",
  };
}

export function recordQuestionStarted(stats: QuizSessionStats): QuizSessionStats {
  return {
    ...stats,
    answered: stats.answered + 1,
  };
}

export function recordIndependentCompletion(stats: QuizSessionStats): QuizSessionStats {
  const currentStreak = stats.currentStreak + 1;
  return {
    answered: stats.answered,
    correct: stats.correct + 1,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
  };
}

export function recordAssistedCompletion(stats: QuizSessionStats): QuizSessionStats {
  return {
    ...stats,
    currentStreak: 0,
  };
}

export function recordAbandonedQuestion(stats: QuizSessionStats): QuizSessionStats {
  return {
    ...stats,
    currentStreak: 0,
  };
}

export function updateStats(stats: QuizSessionStats, isCorrect: boolean): QuizSessionStats {
  const currentStreak = isCorrect ? stats.currentStreak + 1 : 0;
  return {
    answered: stats.answered + 1,
    correct: stats.correct + (isCorrect ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
  };
}
