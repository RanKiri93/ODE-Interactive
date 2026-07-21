import type {
  BetaConstraint,
  Difficulty,
  EquationKind,
  LambdaConstraint,
  QuizSessionStats,
  RealPairDomain,
  ReconstructionBehaviorCondition,
  ReconstructionCaseFilter,
  ReconstructionDetermination,
  ReconstructionFeasibilityAnswer,
  ReconstructionImpossibleReason,
  ReconstructionOutcome,
  StabilityClassification,
  StabilityReason,
} from "./types";

export const MAX_DEGREE = 6;
export const MIN_PRACTICE_DEGREE = 2;
export const EPS = 1e-9;

/** Reject generated Euler equations whose coefficients exceed this absolute value. */
export const MAX_ABS_EULER_COEFFICIENT = 240;
/** Reject Euler coefficients with more than this many digits (excluding sign). */
export const MAX_EULER_COEFFICIENT_DIGITS = 3;
/** Maximum deterministic retries when coefficient quality checks fail. */
export const MAX_GENERATION_ATTEMPTS = 48;

export const MAX_INITIAL_CONDITION_DEGREE = 4;
export const MAX_ABS_INITIAL_VALUE = 60;
export const MAX_INITIAL_GENERATION_ATTEMPTS = 32;
export const EASY_INITIAL_COEFFICIENT_POOL = [-2, -1, 0, 1, 2] as const;
export const DEFAULT_INITIAL_COEFFICIENT_POOL = [-3, -2, -1, 0, 1, 2, 3] as const;

export const EASY_REAL_ROOTS = [-3, -2, -1, 1, 2, 3] as const;
export const DEFAULT_REAL_ROOTS = [-3, -2, -1, 0, 1, 2, 3] as const;

export const COMPLEX_POOL_MEDIUM = [
  { real: 0, imagAbs: 1 },
  { real: 1, imagAbs: 1 },
  { real: -1, imagAbs: 1 },
  { real: 2, imagAbs: 1 },
] as const;

export const COMPLEX_POOL_HARD = [
  ...COMPLEX_POOL_MEDIUM,
  { real: -2, imagAbs: 1 },
  { real: 1, imagAbs: 2 },
  { real: 2, imagAbs: 3 },
] as const;

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

export const equationKindLabels: Record<EquationKind, string> = {
  "constant-coefficients": "מקדמים קבועים",
  euler: "משוואת אוילר",
};

export function equationDomainLatex(equationKind: EquationKind): string {
  return equationKind === "euler" ? "x>0" : "\\mathbb R";
}

export const emptyQuizStats: QuizSessionStats = {
  answered: 0,
  correct: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export const stabilityClassificationOptions: Array<{
  value: StabilityClassification;
  label: string;
  description: string;
}> = [
  {
    value: "asymptotically-stable",
    label: "יציבה אסימפטוטית",
    description: "כל פתרון שואף לאפס.",
  },
  {
    value: "stable-not-asymptotic",
    label: "יציבה אך לא יציבה אסימפטוטית",
    description: "כל פתרון חסום, אך לא כל פתרון שואף לאפס.",
  },
  {
    value: "unstable",
    label: "אינה יציבה",
    description: "קיים פתרון שאינו חסום.",
  },
];

export const stabilityReasonOptions: Array<{
  value: StabilityReason;
  label: string;
}> = [
  {
    value: "all-strictly-negative",
    label: "לכל השורשים חלק ממשי שלילי.",
  },
  {
    value: "simple-imaginary-axis-roots",
    label: "אין שורש בעל חלק ממשי חיובי, יש שורש על הציר המדומה, וכל השורשים שעל הציר המדומה פשוטים.",
  },
  {
    value: "positive-real-part-root",
    label: "קיים שורש בעל חלק ממשי חיובי.",
  },
  {
    value: "repeated-imaginary-axis-root",
    label: "אין שורש בעל חלק ממשי חיובי, אך קיים שורש על הציר המדומה בריבוי גדול מ־1.",
  },
];

export const stabilityClassificationExplanation: Record<StabilityClassification, string> = {
  "asymptotically-stable": "יציבה אסימפטוטית",
  "stable-not-asymptotic": "יציבה אך לא יציבה אסימפטוטית",
  unstable: "אינה יציבה",
};

export const stabilityReasonExplanation: Record<StabilityReason, string> = {
  "all-strictly-negative": "לכל השורשים חלק ממשי שלילי",
  "simple-imaginary-axis-roots":
    "אין שורשים בעלי חלק ממשי חיובי וכל השורשים שעל הציר המדומה פשוטים",
  "positive-real-part-root": "קיים שורש בעל חלק ממשי חיובי",
  "repeated-imaginary-axis-root":
    "אין שורש בעל חלק ממשי חיובי, אך קיים שורש על הציר המדומה בריבוי גדול מ־1",
};

export const reconstructionCaseFilterLabels: Record<ReconstructionCaseFilter, string> = {
  mixed: "מעורב",
  unique: "משוואה יחידה",
  "one-real-parameter": "משפחה חד־פרמטרית",
  "two-parameter": "משפחה דו־פרמטרית",
  impossible: "אין משוואה מתאימה",
};

export const reconstructionBehaviorLabels: Record<ReconstructionBehaviorCondition, string | null> = {
  none: null,
  "bounded-plus-infinity": "כל פתרונות המשוואה חסומים כאשר",
  "bounded-minus-infinity": "כל פתרונות המשוואה חסומים כאשר",
  "decay-plus-infinity": "כל פתרונות המשוואה שואפים לאפס כאשר",
  "decay-minus-infinity": "כל פתרונות המשוואה שואפים לאפס כאשר",
};

export const reconstructionFeasibilityOptions: Array<{
  value: ReconstructionFeasibilityAnswer;
  label: string;
}> = [
  { value: "feasible", label: "כן, קיימת לפחות משוואה אחת כזו." },
  { value: "infeasible", label: "לא, הנתונים אינם יכולים להתקיים יחד." },
];

export const reconstructionDeterminationOptions: Array<{
  value: ReconstructionDetermination;
  label: string;
  description?: string;
}> = [
  {
    value: "unique",
    label: "משוואה יחידה",
    description: "השורשים המוכרחים ממלאים את כל סדר המשוואה.",
  },
  {
    value: "one-real-parameter",
    label: "משפחה חד־פרמטרית",
    description: "נותר שורש ממשי חופשי אחד.",
  },
];

export const reconstructionDeterminationOptionsOrder3: Array<{
  value: ReconstructionDetermination;
  label: string;
  description?: string;
}> = [
  ...reconstructionDeterminationOptions,
  {
    value: "two-parameter",
    label: "משפחה דו־פרמטרית",
    description: "נותר גורם ריבועי חופשי, המתאר שני שורשים חסרים.",
  },
];

export const reconstructionOutcomeOptions: Array<{
  value: ReconstructionOutcome;
  label: string;
}> = [
  { value: "unique", label: "המשוואה המנורמלת נקבעת באופן יחיד." },
  {
    value: "one-real-parameter",
    label: "מתקבלת משפחה חד־פרמטרית של משוואות.",
  },
  { value: "impossible", label: "לא קיימת משוואה המתאימה לכל הנתונים." },
];

export const lambdaConstraintOptions: Array<{
  value: LambdaConstraint;
  label: string;
  latex: string;
}> = [
  { value: "all-real", label: "כל ערך ממשי", latex: "\\lambda\\in\\mathbb R" },
  { value: "negative", label: "שלילי ממש", latex: "\\lambda<0" },
  { value: "non-positive", label: "לא חיובי", latex: "\\lambda\\le0" },
  { value: "positive", label: "חיובי ממש", latex: "\\lambda>0" },
  { value: "non-negative", label: "לא שלילי", latex: "\\lambda\\ge0" },
];

export const realPairDomainOptions: Array<{
  value: RealPairDomain;
  latex: string;
}> = [
  { value: "all-real-pairs", latex: "(\\lambda_1,\\lambda_2)\\in\\mathbb R^2" },
  {
    value: "non-positive-not-both-zero",
    latex: "\\lambda_1,\\lambda_2\\le0,\\quad(\\lambda_1,\\lambda_2)\\ne(0,0)",
  },
  { value: "strictly-negative", latex: "\\lambda_1<0,\\quad\\lambda_2<0" },
  {
    value: "non-negative-not-both-zero",
    latex: "\\lambda_1,\\lambda_2\\ge0,\\quad(\\lambda_1,\\lambda_2)\\ne(0,0)",
  },
  { value: "strictly-positive", latex: "\\lambda_1>0,\\quad\\lambda_2>0" },
];

export const betaConstraintOptions: Array<{
  value: BetaConstraint;
  label: string;
  latex: string;
}> = [
  { value: "all-real", label: "כל ערך ממשי", latex: "\\beta\\in\\mathbb R" },
  { value: "nonzero", label: "שונה מאפס", latex: "\\beta\\ne0" },
  { value: "non-negative", label: "לא שלילי", latex: "\\beta\\ge0" },
  { value: "positive", label: "חיובי ממש", latex: "\\beta>0" },
];

export const reconstructionImpossibleReasonOptions: Array<{
  value: ReconstructionImpossibleReason;
  label: string;
  latex?: string;
  suffix?: string;
}> = [
  {
    value: "forced-degree-exceeds-order",
    label: "הפתרונות הנתונים מחייבים מספר שורשים, כולל ריבויים, הגדול מסדר המשוואה.",
  },
  {
    value: "given-solution-unbounded-plus-infinity",
    label: "אחד הפתרונות הנתונים אינו חסום כאשר",
    latex: "x\\to+\\infty",
    suffix: ", בניגוד לנתון שכל הפתרונות חסומים.",
  },
  {
    value: "given-solution-unbounded-minus-infinity",
    label: "אחד הפתרונות הנתונים אינו חסום כאשר",
    latex: "x\\to-\\infty",
    suffix: ", בניגוד לנתון שכל הפתרונות חסומים.",
  },
  {
    value: "given-solution-does-not-decay-plus-infinity",
    label: "אחד הפתרונות הנתונים אינו שואף לאפס כאשר",
    latex: "x\\to+\\infty",
    suffix: ", בניגוד לנתון שכל הפתרונות שואפים לאפס.",
  },
  {
    value: "given-solution-does-not-decay-minus-infinity",
    label: "אחד הפתרונות הנתונים אינו שואף לאפס כאשר",
    latex: "x\\to-\\infty",
    suffix: ", בניגוד לנתון שכל הפתרונות שואפים לאפס.",
  },
];
