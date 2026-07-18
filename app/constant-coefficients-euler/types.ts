export type EulerActivityTab = "intro" | "equation-assembler" | "equation-practice";

export type PracticeMode =
  | "constant-coefficients"
  | "euler-transformation"
  | "equation-reconstruction";

export type EquationKind = "constant-coefficients" | "euler";

export type BasisDisplayContext = "constant-x" | "constant-t" | "euler-x";

export type Difficulty = "easy" | "medium" | "hard";

export type BasisToken =
  | { kind: "real"; real: number; power: number }
  | { kind: "complex-cos"; real: number; imagAbs: number; power: number }
  | { kind: "complex-sin"; real: number; imagAbs: number; power: number };

export type BasisDraftRow = {
  id: string;
  kind: "real" | "cos" | "sin";
  real: string;
  imagAbs: string;
  power: string;
};

export type BasisEntry = {
  id: string;
  token: BasisToken;
};

export type GeneratedEquationQuestion = {
  seed: number;
  degree: number;
  difficulty: Difficulty;
  equationKind: EquationKind;
  rootGroups: SolutionRootGroup[];
  characteristicPolynomial: number[];
  eulerCoefficients: number[];
  equationLatex: string;
  polynomialLatex: string;
  expectedBasisTokens: BasisToken[];
  expectedBasisLatex: string[];
};

export type BasisCheckResult = {
  isCorrect: boolean;
  missing: BasisToken[];
  extra: BasisToken[];
  errors: string[];
};

export type QuizSessionStats = {
  answered: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
};

export type RandomSource = {
  next: () => number;
  integer: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export type RootRowDraft = {
  id: string;
  real: string;
  imag: string;
  multiplicity: string;
};

export type ParsedRoot = {
  real: number;
  imag: number;
  multiplicity: number;
};

export type SolutionRootGroup =
  | { kind: "real"; real: number; multiplicity: number }
  | { kind: "complex"; real: number; imagAbs: number; multiplicity: number };

export type StageStatus = "locked" | "unanswered" | "incorrect" | "correct" | "revealed";

export type RootGroupDraft = {
  id: string;
  kind: "real" | "complex-pair";
  real: string;
  imagAbs: string;
  multiplicity: string;
};

export type CoefficientFieldStatus = "neutral" | "empty" | "invalid" | "correct" | "incorrect";

export type PolynomialEvaluationResult = {
  isCorrect: boolean;
  emptyIndexes: number[];
  invalidIndexes: number[];
  incorrectIndexes: number[];
  errors: string[];
  coefficients: number[] | null;
};

export type RootComparisonResult = {
  isCorrect: boolean;
  invalidGroups: number[];
  degreeMismatch: boolean;
  enteredDegree: number;
  expectedDegree: number;
  missing: SolutionRootGroup[];
  extra: SolutionRootGroup[];
  multiplicityMismatches: SolutionRootGroup[];
  errors: string[];
  groups: SolutionRootGroup[] | null;
};

export type ConstantCoefficientPracticeQuestion = {
  seed: number;
  degree: number;
  difficulty: Difficulty;
  equationLatex: string;
  polynomialCoefficients: number[];
  polynomialLatex: string;
  factoredPolynomialLatex: string;
  roots: SolutionRootGroup[];
  expectedBasis: BasisToken[];
  expectedBasisLatex: string[];
  initialConditions: InitialConditionData | null;
};

export type InitialConditionData = {
  orderedBasis: BasisToken[];
  expectedCoefficients: number[];
  derivativeMatrix: number[][];
  initialValues: number[];
};

export type InitialCoefficientEvaluationResult = {
  isCorrect: boolean;
  emptyIndexes: number[];
  invalidIndexes: number[];
  incorrectIndexes: number[];
  parsedValues: Array<number | null>;
  message: string;
};

export type FullSolutionExerciseState = {
  polynomialStatus: StageStatus;
  rootsStatus: StageStatus;
  basisStatus: StageStatus;
  initialConditionsStatus: StageStatus;
  stabilityStatus: StageStatus;
  rootsEverUnlocked: boolean;
  basisEverUnlocked: boolean;
  initialConditionsEverUnlocked: boolean;
  stabilityEverUnlocked: boolean;
  usedReveal: boolean;
  completed: boolean;
  completionKind: "none" | "independent" | "assisted";
};

export type EulerTransformationPracticeQuestion = {
  seed: number;
  degree: number;
  difficulty: Difficulty;
  /** Falling-factorial coefficients [b0, ..., bn] for sum b_k x^k y^(k). */
  eulerCoefficients: number[];
  eulerEquationLatex: string;
  /** Power-basis characteristic polynomial [a0, ..., an] for p(r) = a0 + ... + an r^n. */
  characteristicPolynomialCoefficients: number[];
  characteristicPolynomialLatex: string;
  factoredPolynomialLatex: string;
  constantCoefficientEquationLatex: string;
  roots: SolutionRootGroup[];
  expectedBasis: BasisToken[];
  expectedBasisLatex: string[];
  expectedEulerBasisLatex: string[];
};

export type EulerTransformationExerciseState = {
  polynomialStatus: StageStatus;
  transformedEquationStatus: StageStatus;
  rootsStatus: StageStatus;
  uBasisStatus: StageStatus;
  yBasisStatus: StageStatus;
  stabilityStatus: StageStatus;
  transformedEquationEverUnlocked: boolean;
  rootsEverUnlocked: boolean;
  uBasisEverUnlocked: boolean;
  yBasisEverUnlocked: boolean;
  stabilityEverUnlocked: boolean;
  usedReveal: boolean;
  completed: boolean;
  completionKind: "none" | "independent" | "assisted";
};

export type StabilityClassification =
  | "asymptotically-stable"
  | "stable-not-asymptotic"
  | "unstable";

export type StabilityReason =
  | "all-strictly-negative"
  | "simple-imaginary-axis-roots"
  | "positive-real-part-root"
  | "repeated-imaginary-axis-root";

export type StabilityAnswerInput = {
  classification: StabilityClassification | null;
  reason: StabilityReason | null;
};

export type StabilityEvaluationResult = {
  isCorrect: boolean;
  classificationCorrect: boolean;
  reasonCorrect: boolean;
  missingClassification: boolean;
  missingReason: boolean;
  expected: {
    classification: StabilityClassification;
    reason: StabilityReason;
    hasPositiveRealPartRoot: boolean;
    hasImaginaryAxisRoot: boolean;
    hasRepeatedImaginaryAxisRoot: boolean;
  };
  message: string;
};

export type PracticeQuestionConfiguration = {
  degree: number;
  difficulty: Difficulty;
  includeInitialConditions: boolean;
  includeStability: boolean;
};

export type ReconstructionCaseFilter =
  | "mixed"
  | "unique"
  | "one-real-parameter"
  | "impossible";

export type ReconstructionBehaviorCondition =
  | "none"
  | "bounded-plus-infinity"
  | "bounded-minus-infinity"
  | "decay-plus-infinity"
  | "decay-minus-infinity";

export type GivenSolutionExpression =
  | {
      kind: "basis-token";
      token: BasisToken;
    }
  | {
      kind: "linear-combination";
      terms: Array<{
        coefficient: number;
        token: BasisToken;
      }>;
    };

export type ReconstructionOutcome = "unique" | "one-real-parameter" | "impossible";

export type ReconstructionFeasibilityAnswer = "feasible" | "infeasible";

export type ReconstructionDetermination = "unique" | "one-real-parameter";

export type LambdaConstraint =
  | "all-real"
  | "negative"
  | "non-positive"
  | "positive"
  | "non-negative";

export type ReconstructionImpossibleReason =
  | "forced-degree-exceeds-order"
  | "given-solution-unbounded-plus-infinity"
  | "given-solution-unbounded-minus-infinity"
  | "given-solution-does-not-decay-plus-infinity"
  | "given-solution-does-not-decay-minus-infinity";

export type ReconstructionFeasibilityAnalysis = {
  feasible: boolean;
  reason: ReconstructionImpossibleReason | null;
  forcedRoots: SolutionRootGroup[];
  forcedDegree: number;
};

export type AffineCoefficient = {
  constant: number;
  lambda: number;
};

export type ReconstructionQuestion = {
  seed: number;
  equationKind: EquationKind;
  order: number;
  difficulty: Difficulty;
  givenSolutionExpressions: GivenSolutionExpression[];
  givenSolutions: BasisToken[];
  givenSolutionsLatex: string[];
  templateId?: string;
  behaviorCondition: ReconstructionBehaviorCondition;
  expectedForcedRoots: SolutionRootGroup[];
  feasibilityAnalysis: ReconstructionFeasibilityAnalysis;
  analysis: import("./math/reconstruction").ReconstructionAnalysis;
};

export type ReconstructionExerciseState = {
  feasibilityStatus: StageStatus;
  infeasibilityReasonStatus: StageStatus;
  forcedRootsStatus: StageStatus;
  outcomeStatus: StageStatus;
  conclusionStatus: StageStatus;
  infeasibilityReasonEverUnlocked: boolean;
  forcedRootsEverUnlocked: boolean;
  outcomeEverUnlocked: boolean;
  conclusionEverUnlocked: boolean;
  usedReveal: boolean;
  completed: boolean;
  completionKind: "none" | "independent" | "assisted";
};
