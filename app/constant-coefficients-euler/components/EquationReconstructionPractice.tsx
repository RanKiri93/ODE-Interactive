import { useEffect, useMemo, useRef, useState } from "react";
import {
  difficultyLabels,
  emptyQuizStats,
  equationKindLabels,
  EPS,
  MAX_DEGREE,
  MIN_PRACTICE_DEGREE,
  reconstructionCaseFilterLabels,
} from "../constants";
import { formatPolynomialLatex } from "../math/polynomial";
import { rootGroupsDegree } from "../math/reconstruction";
import {
  evaluateFeasibilityAnswer,
  evaluateImpossibleReasonAnswer,
  evaluateLambdaConstraintAnswer,
  evaluateOutcomeAnswer,
  evaluateUniqueEquationPair,
  expectedFeasibilityFromAnalysis,
} from "../practice/reconstructionEvaluation";
import { buildReconstructionQuestion } from "../practice/reconstructionQuestionGeneration";
import {
  coefficientFieldStatus,
  defaultNormalizedTrailingDraft,
  defaultPolynomialDraft,
  evaluateNormalizedPolynomialAnswer,
  evaluatePolynomialAnswer,
  normalizedTrailingDraftFromCoefficients,
  polynomialDraftFromCoefficients,
} from "../practice/polynomialEvaluation";
import {
  compareRootGroups,
  defaultRootGroupDrafts,
  rootGroupDraftsFromGroups,
  totalDraftDegree,
} from "../practice/rootEvaluation";
import {
  createInitialReconstructionExerciseState,
  recordAbandonedQuestion,
  recordAssistedCompletion,
  recordIndependentCompletion,
  recordQuestionStarted,
} from "../practice/stats";
import type {
  CoefficientFieldStatus,
  Difficulty,
  EquationKind,
  LambdaConstraint,
  PolynomialEvaluationResult,
  ReconstructionCaseFilter,
  ReconstructionDetermination,
  ReconstructionExerciseState,
  ReconstructionFeasibilityAnswer,
  ReconstructionImpossibleReason,
  RootComparisonResult,
  RootGroupDraft,
} from "../types";
import { createId } from "../utils/id";
import { formatConstantCoefficientEquation, formatEulerEquation } from "../math/polynomial";
import { DifferentialEquationCoefficientEditor } from "./DifferentialEquationCoefficientEditor";
import { EulerCoefficientEditor } from "./EulerCoefficientEditor";
import { MathText } from "./MathText";
import { PolynomialCoefficientEditor } from "./PolynomialCoefficientEditor";
import { PracticeRootGroupEditor, RootStageHints } from "./PracticeRootGroupEditor";
import { PracticeStats } from "./PracticeStats";
import { ReconstructionGivenData } from "./ReconstructionGivenData";
import {
  ReconstructionDeterminationInput,
  ReconstructionFeasibilityInput,
  ReconstructionImpossibleReasonInput,
} from "./ReconstructionInputs";
import { ReconstructionFamilyConclusion } from "./ReconstructionFamilyConclusion";
import { StepCard } from "./StepCard";

function usesNormalizedOrder2Input(equationKind: EquationKind, order: number): boolean {
  return equationKind === "constant-coefficients" && order === 2;
}

function defaultConclusionCoefficientDraft(equationKind: EquationKind, order: number): string[] {
  return usesNormalizedOrder2Input(equationKind, order)
    ? defaultNormalizedTrailingDraft(order)
    : defaultPolynomialDraft(order);
}

function resetAnswerState(equationKind: EquationKind, order: number) {
  return {
    feasibilityAnswer: null as ReconstructionFeasibilityAnswer | null,
    rootRows: defaultRootGroupDrafts(1),
    determination: null as ReconstructionDetermination | null,
    lambdaConstraint: null as LambdaConstraint | null,
    impossibleReason: null as ReconstructionImpossibleReason | null,
    polyCoeffs: defaultConclusionCoefficientDraft(equationKind, order),
    equationCoeffs: defaultConclusionCoefficientDraft(equationKind, order),
    exercise: createInitialReconstructionExerciseState(),
    feasibilityResult: null as { isCorrect: boolean; message: string } | null,
    infeasibilityReasonResult: null as { isCorrect: boolean; message: string } | null,
    rootResult: null as RootComparisonResult | null,
    determinationResult: null as { isCorrect: boolean; message: string } | null,
    polyResult: null as PolynomialEvaluationResult | null,
    equationResult: null as PolynomialEvaluationResult | null,
    conclusionResult: null as { isCorrect: boolean; message: string } | null,
  };
}

function clearFeasibleBranchInputs(equationKind: EquationKind, order: number) {
  return {
    rootRows: defaultRootGroupDrafts(1),
    determination: null as ReconstructionDetermination | null,
    lambdaConstraint: null as LambdaConstraint | null,
    polyCoeffs: defaultConclusionCoefficientDraft(equationKind, order),
    equationCoeffs: defaultConclusionCoefficientDraft(equationKind, order),
    rootResult: null as RootComparisonResult | null,
    determinationResult: null as { isCorrect: boolean; message: string } | null,
    polyResult: null as PolynomialEvaluationResult | null,
    equationResult: null as PolynomialEvaluationResult | null,
    conclusionResult: null as { isCorrect: boolean; message: string } | null,
  };
}

export function EquationReconstructionPractice() {
  const [equationKind, setEquationKind] = useState<EquationKind>("constant-coefficients");
  const [order, setOrder] = useState(MIN_PRACTICE_DEGREE);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [caseFilter, setCaseFilter] = useState<ReconstructionCaseFilter>("mixed");
  const [seed, setSeed] = useState(104141);
  const [stats, setStats] = useState(emptyQuizStats);

  const [feasibilityAnswer, setFeasibilityAnswer] = useState<ReconstructionFeasibilityAnswer | null>(null);
  const [rootRows, setRootRows] = useState<RootGroupDraft[]>(() => defaultRootGroupDrafts(1));
  const [determination, setDetermination] = useState<ReconstructionDetermination | null>(null);
  const [lambdaConstraint, setLambdaConstraint] = useState<LambdaConstraint | null>(null);
  const [impossibleReason, setImpossibleReason] = useState<ReconstructionImpossibleReason | null>(null);
  const [polyCoeffs, setPolyCoeffs] = useState(() => defaultPolynomialDraft(MIN_PRACTICE_DEGREE));
  const [equationCoeffs, setEquationCoeffs] = useState(() => defaultPolynomialDraft(MIN_PRACTICE_DEGREE));
  const [exercise, setExercise] = useState<ReconstructionExerciseState>(createInitialReconstructionExerciseState);

  const [feasibilityResult, setFeasibilityResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [infeasibilityReasonResult, setInfeasibilityReasonResult] = useState<{
    isCorrect: boolean;
    message: string;
  } | null>(null);
  const [rootResult, setRootResult] = useState<RootComparisonResult | null>(null);
  const [determinationResult, setDeterminationResult] = useState<{ isCorrect: boolean; message: string } | null>(
    null,
  );
  const [polyResult, setPolyResult] = useState<PolynomialEvaluationResult | null>(null);
  const [equationResult, setEquationResult] = useState<PolynomialEvaluationResult | null>(null);
  const [conclusionResult, setConclusionResult] = useState<{ isCorrect: boolean; message: string } | null>(null);

  const initialStartedRef = useRef(false);

  const question = useMemo(
    () => buildReconstructionQuestion({ seed, equationKind, order, difficulty, caseFilter }),
    [seed, equationKind, order, difficulty, caseFilter],
  );

  const expectedFeasibility = expectedFeasibilityFromAnalysis(question.feasibilityAnalysis);
  const expectedForcedDegree = rootGroupsDegree(question.expectedForcedRoots);
  const enteredForcedDegree = totalDraftDegree(rootRows);
  const expectedDetermination =
    question.analysis.kind === "impossible" ? null : question.analysis.kind;

  useEffect(() => {
    if (!initialStartedRef.current) {
      initialStartedRef.current = true;
      setStats((current) => recordQuestionStarted(current));
    }
  }, []);

  const infeasibilityReasonLocked = !exercise.infeasibilityReasonEverUnlocked;
  const forcedRootsLocked = !exercise.forcedRootsEverUnlocked;
  const determinationLocked = !exercise.outcomeEverUnlocked;
  const conclusionLocked = !exercise.conclusionEverUnlocked;

  const showInfeasibilityReasonStage =
    feasibilityAnswer === "infeasible" && exercise.infeasibilityReasonEverUnlocked;
  const showFeasibleStages = feasibilityAnswer === "feasible" && exercise.forcedRootsEverUnlocked;

  const cancelCompletion = () => ({
    completed: false,
    completionKind: "none" as const,
  });

  const clearLaterStageResults = () => {
    setInfeasibilityReasonResult(null);
    setRootResult(null);
    setDeterminationResult(null);
    setPolyResult(null);
    setEquationResult(null);
    setConclusionResult(null);
  };

  const handleFeasibilityChange = (value: ReconstructionFeasibilityAnswer) => {
    setFeasibilityAnswer(value);
    setFeasibilityResult(null);
    clearLaterStageResults();

    if (value === "infeasible") {
      setImpossibleReason(null);
      const cleared = clearFeasibleBranchInputs(equationKind, order);
      setRootRows(cleared.rootRows);
      setDetermination(cleared.determination);
      setLambdaConstraint(cleared.lambdaConstraint);
      setPolyCoeffs(cleared.polyCoeffs);
      setEquationCoeffs(cleared.equationCoeffs);
      setExercise((current) => ({
        ...current,
        feasibilityStatus: "unanswered",
        infeasibilityReasonEverUnlocked: true,
        infeasibilityReasonStatus: "unanswered",
        forcedRootsEverUnlocked: false,
        forcedRootsStatus: "locked",
        outcomeEverUnlocked: false,
        outcomeStatus: "locked",
        conclusionEverUnlocked: false,
        conclusionStatus: "locked",
        ...cancelCompletion(),
      }));
      return;
    }

    setImpossibleReason(null);
    setExercise((current) => ({
      ...current,
      feasibilityStatus: "unanswered",
      infeasibilityReasonEverUnlocked: false,
      infeasibilityReasonStatus: "locked",
      forcedRootsEverUnlocked: false,
      forcedRootsStatus: "locked",
      outcomeEverUnlocked: false,
      outcomeStatus: "locked",
      conclusionEverUnlocked: false,
      conclusionStatus: "locked",
      ...cancelCompletion(),
    }));
  };

  const invalidateFromInfeasibilityReasonEdit = () => {
    setExercise((current) => ({
      ...current,
      infeasibilityReasonStatus: "unanswered",
      ...cancelCompletion(),
    }));
    setInfeasibilityReasonResult(null);
  };

  const invalidateFromForcedRootsEdit = () => {
    setExercise((current) => ({
      ...current,
      forcedRootsStatus: "unanswered",
      outcomeStatus: current.outcomeEverUnlocked ? "unanswered" : "locked",
      conclusionStatus: current.conclusionEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setRootResult(null);
    setDeterminationResult(null);
    setPolyResult(null);
    setEquationResult(null);
    setConclusionResult(null);
  };

  const invalidateFromDeterminationEdit = () => {
    setExercise((current) => ({
      ...current,
      outcomeStatus: "unanswered",
      conclusionStatus: current.conclusionEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setDeterminationResult(null);
    setPolyResult(null);
    setEquationResult(null);
    setConclusionResult(null);
  };

  const invalidateFromConclusionEdit = () => {
    setExercise((current) => ({
      ...current,
      conclusionStatus: "unanswered",
      ...cancelCompletion(),
    }));
    setPolyResult(null);
    setEquationResult(null);
    setConclusionResult(null);
  };

  const applyCompletion = (assisted: boolean) => {
    if (exercise.completed) {
      return;
    }
    setExercise((current) => ({
      ...current,
      completed: true,
      completionKind: assisted ? "assisted" : "independent",
      conclusionStatus: assisted ? "revealed" : "correct",
    }));
    setStats((current) =>
      assisted ? recordAssistedCompletion(current) : recordIndependentCompletion(current),
    );
  };

  const applyInfeasibleCompletion = (assisted: boolean) => {
    if (exercise.completed) {
      return;
    }
    setExercise((current) => ({
      ...current,
      completed: true,
      completionKind: assisted ? "assisted" : "independent",
      infeasibilityReasonStatus: assisted ? "revealed" : "correct",
    }));
    setStats((current) =>
      assisted ? recordAssistedCompletion(current) : recordIndependentCompletion(current),
    );
  };

  const unlockForcedRootsStage = () => {
    setExercise((current) => ({
      ...current,
      forcedRootsEverUnlocked: true,
      forcedRootsStatus: "unanswered",
    }));
  };

  const unlockDeterminationStage = () => {
    setExercise((current) => ({
      ...current,
      outcomeEverUnlocked: true,
      outcomeStatus: "unanswered",
    }));
  };

  const unlockConclusionStage = () => {
    setExercise((current) => ({
      ...current,
      conclusionEverUnlocked: true,
      conclusionStatus: "unanswered",
    }));
  };

  const clearAnswerOnly = (nextOrder = order) => {
    const reset = resetAnswerState(equationKind, nextOrder);
    setFeasibilityAnswer(reset.feasibilityAnswer);
    setRootRows(reset.rootRows);
    setDetermination(reset.determination);
    setLambdaConstraint(reset.lambdaConstraint);
    setImpossibleReason(reset.impossibleReason);
    setPolyCoeffs(reset.polyCoeffs);
    setEquationCoeffs(reset.equationCoeffs);
    setExercise(reset.exercise);
    setFeasibilityResult(reset.feasibilityResult);
    setInfeasibilityReasonResult(reset.infeasibilityReasonResult);
    setRootResult(reset.rootResult);
    setDeterminationResult(reset.determinationResult);
    setPolyResult(reset.polyResult);
    setEquationResult(reset.equationResult);
    setConclusionResult(reset.conclusionResult);
  };

  const beginQuestion = ({
    seedStep,
    nextOrder = order,
    nextDifficulty = difficulty,
    nextEquationKind = equationKind,
    nextCaseFilter = caseFilter,
    abandonIncomplete = false,
  }: {
    seedStep: number;
    nextOrder?: number;
    nextDifficulty?: Difficulty;
    nextEquationKind?: EquationKind;
    nextCaseFilter?: ReconstructionCaseFilter;
    abandonIncomplete?: boolean;
  }) => {
    if (abandonIncomplete && !exercise.completed) {
      setStats((current) => recordAbandonedQuestion(current));
    }
    setOrder(nextOrder);
    setDifficulty(nextDifficulty);
    setEquationKind(nextEquationKind);
    setCaseFilter(nextCaseFilter);
    setSeed((current) => current + seedStep);
    clearAnswerOnly(nextOrder);
    setStats((current) => recordQuestionStarted(current));
  };

  const checkFeasibility = () => {
    if (exercise.completed) {
      return;
    }
    const result = evaluateFeasibilityAnswer(feasibilityAnswer, expectedFeasibility);
    setFeasibilityResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, feasibilityStatus: "correct" }));
      if (feasibilityAnswer === "feasible") {
        unlockForcedRootsStage();
      }
    } else {
      setExercise((current) => ({ ...current, feasibilityStatus: "incorrect" }));
    }
  };

  const revealFeasibility = () => {
    setFeasibilityAnswer(expectedFeasibility);
    setFeasibilityResult({
      isCorrect: true,
      message:
        expectedFeasibility === "feasible"
          ? "הנתונים יכולים להתקיים יחד."
          : "נכון — אין משוואה המתאימה לכל הנתונים.",
    });
    setExercise((current) => ({
      ...current,
      feasibilityStatus: "revealed",
      usedReveal: true,
      infeasibilityReasonEverUnlocked: expectedFeasibility === "infeasible",
      infeasibilityReasonStatus: expectedFeasibility === "infeasible" ? "unanswered" : "locked",
    }));
    if (expectedFeasibility === "feasible") {
      unlockForcedRootsStage();
    }
  };

  const checkInfeasibilityReason = () => {
    if (exercise.completed || infeasibilityReasonLocked || question.analysis.kind !== "impossible") {
      return;
    }
    const feasibilityCheck = evaluateFeasibilityAnswer(feasibilityAnswer, expectedFeasibility);
    if (!feasibilityCheck.isCorrect) {
      setInfeasibilityReasonResult({
        isCorrect: false,
        message: "יש לזהות תחילה שהנתונים אינם יכולים להתקיים יחד.",
      });
      return;
    }
    const result = evaluateImpossibleReasonAnswer(impossibleReason, question.analysis.reason);
    setInfeasibilityReasonResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, feasibilityStatus: "correct", infeasibilityReasonStatus: "correct" }));
      applyInfeasibleCompletion(exercise.usedReveal);
    } else {
      setExercise((current) => ({ ...current, infeasibilityReasonStatus: "incorrect" }));
    }
  };

  const revealInfeasibilityReason = () => {
    if (question.analysis.kind !== "impossible") {
      return;
    }
    setImpossibleReason(question.analysis.reason);
    setInfeasibilityReasonResult({
      isCorrect: true,
      message: "הסיבה שנבחרה נכונה.",
    });
    setExercise((current) => ({
      ...current,
      infeasibilityReasonStatus: "revealed",
      feasibilityStatus: "revealed",
      usedReveal: true,
    }));
    applyInfeasibleCompletion(true);
  };

  const checkForcedRoots = () => {
    if (exercise.completed || forcedRootsLocked) {
      return;
    }
    const result = compareRootGroups(rootRows, question.expectedForcedRoots, expectedForcedDegree);
    setRootResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, forcedRootsStatus: "correct" }));
      unlockDeterminationStage();
    } else {
      setExercise((current) => ({ ...current, forcedRootsStatus: "incorrect" }));
    }
  };

  const revealForcedRoots = () => {
    setRootRows(rootGroupDraftsFromGroups(question.expectedForcedRoots));
    setRootResult({
      isCorrect: true,
      invalidGroups: [],
      degreeMismatch: false,
      enteredDegree: expectedForcedDegree,
      expectedDegree: expectedForcedDegree,
      missing: [],
      extra: [],
      multiplicityMismatches: [],
      errors: [],
      groups: question.expectedForcedRoots,
    });
    setExercise((current) => ({
      ...current,
      forcedRootsStatus: "revealed",
      usedReveal: true,
    }));
    unlockDeterminationStage();
  };

  const checkDetermination = () => {
    if (exercise.completed || determinationLocked || !expectedDetermination) {
      return;
    }
    const result = evaluateOutcomeAnswer(determination, expectedDetermination);
    setDeterminationResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, outcomeStatus: "correct" }));
      unlockConclusionStage();
    } else {
      setExercise((current) => ({ ...current, outcomeStatus: "incorrect" }));
    }
  };

  const revealDetermination = () => {
    if (!expectedDetermination) {
      return;
    }
    setDetermination(expectedDetermination);
    setDeterminationResult({
      isCorrect: true,
      message:
        expectedDetermination === "unique"
          ? "נכון. מתקבלת משוואה מנורמלת יחידה."
          : "נכון. מתקבלת משפחה חד־פרמטרית של משוואות מנורמלות.",
    });
    setExercise((current) => ({
      ...current,
      outcomeStatus: "revealed",
      usedReveal: true,
    }));
    unlockConclusionStage();
  };

  const normalizedOrder2Input = usesNormalizedOrder2Input(equationKind, order);

  const checkConclusion = () => {
    if (exercise.completed || conclusionLocked || question.analysis.kind === "impossible") {
      return;
    }

    if (question.analysis.kind === "unique") {
      const evaluate = normalizedOrder2Input
        ? evaluateNormalizedPolynomialAnswer
        : evaluatePolynomialAnswer;
      const polyEval = evaluate(polyCoeffs, question.analysis.polynomialCoefficients);
      const eqEval = evaluate(equationCoeffs, question.analysis.equationCoefficients);
      setPolyResult(polyEval);
      setEquationResult(eqEval);
      const pair = evaluateUniqueEquationPair(polyEval.isCorrect, eqEval.isCorrect);
      setConclusionResult(pair);
      if (pair.isCorrect) {
        setExercise((current) => ({ ...current, conclusionStatus: "correct" }));
        applyCompletion(exercise.usedReveal);
      } else {
        setExercise((current) => ({ ...current, conclusionStatus: "incorrect" }));
      }
      return;
    }

    const result = evaluateLambdaConstraintAnswer(lambdaConstraint, question.analysis.lambdaConstraint);
    const isZeroCollisionIncorrect =
      !result.isCorrect &&
      question.analysis.kind === "one-real-parameter" &&
      question.analysis.forcedRoots.some(
        (group) => group.kind === "real" && Math.abs(group.real) < EPS && group.multiplicity === 1,
      ) &&
      ((question.behaviorCondition === "bounded-plus-infinity" &&
        lambdaConstraint === "non-positive") ||
        (question.behaviorCondition === "bounded-minus-infinity" &&
          lambdaConstraint === "non-negative"));
    setConclusionResult({
      isCorrect: result.isCorrect,
      message: isZeroCollisionIncorrect ? "zero-collision-incorrect" : result.message,
    });
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, conclusionStatus: "correct" }));
      applyCompletion(exercise.usedReveal);
    } else {
      setExercise((current) => ({ ...current, conclusionStatus: "incorrect" }));
    }
  };

  const revealConclusion = () => {
    if (question.analysis.kind === "unique") {
      if (normalizedOrder2Input) {
        setPolyCoeffs(
          normalizedTrailingDraftFromCoefficients(question.analysis.polynomialCoefficients),
        );
        setEquationCoeffs(
          normalizedTrailingDraftFromCoefficients(question.analysis.equationCoefficients),
        );
      } else {
        setPolyCoeffs(polynomialDraftFromCoefficients(question.analysis.polynomialCoefficients));
        setEquationCoeffs(
          polynomialDraftFromCoefficients(question.analysis.equationCoefficients),
        );
      }
    } else if (question.analysis.kind === "one-real-parameter") {
      setLambdaConstraint(question.analysis.lambdaConstraint);
    }
    setExercise((current) => ({
      ...current,
      conclusionStatus: "revealed",
      usedReveal: true,
    }));
    applyCompletion(true);
  };

  const polyFieldStatuses: CoefficientFieldStatus[] = polyCoeffs.map((_, index) =>
    coefficientFieldStatus(index, polyResult),
  );
  const equationFieldStatuses: CoefficientFieldStatus[] = equationCoeffs.map((_, index) =>
    coefficientFieldStatus(index, equationResult),
  );

  const renderConclusionStage = () => {
    if (question.analysis.kind === "unique") {
      return (
        <>
          <p className="activity-hint">
            השורשים המוכרחים ממלאים את כל סדר המשוואה. לכן מתקבלת משוואה מנורמלת יחידה.
          </p>
          <p className="activity-hint">
            הפולינום האופייני המנורמל הוא:{" "}
            <MathText
              math={`p(r)=${formatPolynomialLatex(question.analysis.polynomialCoefficients, "r")}`}
            />
          </p>
          <p className="activity-hint">מהי המשוואה המנורמלת המתאימה לפולינום זה?</p>
          <PolynomialCoefficientEditor
            degree={order}
            coefficients={polyCoeffs}
            fieldStatuses={polyFieldStatuses}
            disabled={exercise.completed}
            hideLeadingCoefficient={normalizedOrder2Input}
            onChange={(index, value) => {
              setPolyCoeffs((current) => current.map((item, idx) => (idx === index ? value : item)));
              invalidateFromConclusionEdit();
            }}
          />
          <p className="activity-hint">המשוואה המנורמלת:</p>
          {question.equationKind === "constant-coefficients" ? (
            <DifferentialEquationCoefficientEditor
              degree={order}
              coefficients={equationCoeffs}
              fieldStatuses={equationFieldStatuses}
              dependentVariable="y"
              disabled={exercise.completed}
              hideLeadingCoefficient={normalizedOrder2Input}
              onChange={(index, value) => {
                setEquationCoeffs((current) =>
                  current.map((item, idx) => (idx === index ? value : item)),
                );
                invalidateFromConclusionEdit();
              }}
            />
          ) : (
            <EulerCoefficientEditor
              degree={order}
              coefficients={equationCoeffs}
              fieldStatuses={equationFieldStatuses}
              disabled={exercise.completed}
              onChange={(index, value) => {
                setEquationCoeffs((current) => current.map((item, idx) => (idx === index ? value : item)));
                invalidateFromConclusionEdit();
              }}
            />
          )}
          {exercise.conclusionStatus === "revealed" || conclusionResult?.isCorrect ? (
            <div className="reconstruction-summary">
              <p className="intro-equation">
                הפולינום האופייני המנורמל הוא:{" "}
                <MathText math={`p(r)=${formatPolynomialLatex(question.analysis.polynomialCoefficients, "r")}`} />
              </p>
              <p className="intro-equation">
                המשוואה המנורמלת היא:{" "}
                <MathText
                  math={
                    question.equationKind === "constant-coefficients"
                      ? formatConstantCoefficientEquation(question.analysis.equationCoefficients)
                      : formatEulerEquation(question.analysis.equationCoefficients)
                  }
                />
              </p>
            </div>
          ) : null}
        </>
      );
    }

    if (question.analysis.kind === "one-real-parameter") {
      return (
        <ReconstructionFamilyConclusion
          question={question}
          lambdaConstraint={lambdaConstraint}
          disabled={exercise.completed}
          showSummary={exercise.conclusionStatus === "revealed" || conclusionResult?.isCorrect === true}
          onChange={(value) => {
            setLambdaConstraint(value);
            invalidateFromConclusionEdit();
          }}
        />
      );
    }

    return null;
  };

  const forcedRootsStepNumber = showInfeasibilityReasonStage ? 3 : 2;
  const determinationStepNumber = forcedRootsStepNumber + 1;
  const reconstructionStepNumber = determinationStepNumber + 1;

  return (
    <section className="practice-grid equation-practice-grid full-practice-grid" aria-label="תרגול שחזור משוואה">
      <aside className="control-panel practice-panel">
        <section className="panel-section">
          <div className="section-heading">סוג משוואה</div>
          <div className="segmented-control">
            {(["constant-coefficients", "euler"] as EquationKind[]).map((option) => (
              <button
                key={option}
                className={equationKind === option ? "selected" : ""}
                type="button"
                onClick={() =>
                  beginQuestion({ seedStep: option === "euler" ? 601 : 607, nextEquationKind: option, abandonIncomplete: true })
                }
              >
                {equationKindLabels[option]}
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">מעלה</div>
          <div className="segmented-control">
            {Array.from({ length: MAX_DEGREE - MIN_PRACTICE_DEGREE + 1 }, (_, index) => {
              const option = index + MIN_PRACTICE_DEGREE;
              return (
                <button
                  key={option}
                  className={order === option ? "selected" : ""}
                  type="button"
                  onClick={() => beginQuestion({ seedStep: option * 7, nextOrder: option, abandonIncomplete: true })}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">רמת קושי</div>
          <div className="segmented-control">
            {(["easy", "medium", "hard"] as Difficulty[]).map((option) => (
              <button
                key={option}
                className={difficulty === option ? "selected" : ""}
                type="button"
                onClick={() =>
                  beginQuestion({
                    seedStep: option === "easy" ? 111 : option === "medium" ? 223 : 331,
                    nextDifficulty: option,
                    abandonIncomplete: true,
                  })
                }
              >
                {difficultyLabels[option]}
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">סוג שאלה</div>
          <div className="segmented-control reconstruction-case-filter">
            {(Object.keys(reconstructionCaseFilterLabels) as ReconstructionCaseFilter[]).map((option) => (
              <button
                key={option}
                className={caseFilter === option ? "selected" : ""}
                type="button"
                onClick={() =>
                  beginQuestion({ seedStep: option === "mixed" ? 1 : 17, nextCaseFilter: option, abandonIncomplete: true })
                }
              >
                {reconstructionCaseFilterLabels[option]}
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">התקדמות</div>
          <PracticeStats stats={stats} />
          <button type="button" className="panel-action" onClick={() => beginQuestion({ seedStep: 1, abandonIncomplete: true })}>
            שאלה חדשה
          </button>
          <button type="button" className="panel-action secondary" onClick={() => clearAnswerOnly()}>
            איפוס תשובה
          </button>
          <button
            type="button"
            className="panel-action secondary"
            onClick={() => {
              setStats(emptyQuizStats);
              clearAnswerOnly();
            }}
          >
            איפוס מעקב
          </button>
        </section>
      </aside>

      <section className="practice-main full-practice-main">
        <div className="practice-question-card">
          <p className="course-kicker">
            Seed {seed} · {equationKindLabels[equationKind]} · {difficultyLabels[difficulty]} · מעלה {order}
          </p>
          <h2>שחזור משוואה מפתרונות</h2>
          <ReconstructionGivenData question={question} />
        </div>

        {exercise.completed ? (
          <section
            className={`result-card primary full-practice-completion ${exercise.completionKind === "assisted" ? "assisted" : "independent"}`}
          >
            <strong>
              {exercise.completionKind === "independent"
                ? "כל הכבוד — השלמת נכון את תרגיל השחזור."
                : "התרגיל הושלם בעזרת הצגת תשובה."}
            </strong>
          </section>
        ) : null}

        <div className="full-practice-steps">
          <StepCard stepNumber={1} title="היתכנות" status={exercise.feasibilityStatus} locked={false}>
            <p className="activity-hint">
              האם קיימת משוואה ממשית ליניארית הומוגנית במקדמים קבועים מסדר {order} המקיימת את כל הנתונים?
            </p>
            <ReconstructionFeasibilityInput
              value={feasibilityAnswer}
              disabled={exercise.completed}
              onChange={handleFeasibilityChange}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>
                בדקו תחילה האם הפתרונות הנתונים ותנאי ההתנהגות כאשר{" "}
                <span className="stability-inline-math">
                  <MathText math={"x\\to\\infty"} />
                </span>{" "}
                יכולים בכלל להתקיים יחד.
              </p>
              <p>השוו את הפתרונות עצמם עם תנאי ההתנהגות, ובדקו האם הריבויים המוכרחים כבר חורגים מהמעלה.</p>
            </details>
            {feasibilityResult && !feasibilityResult.isCorrect ? (
              <p className="stage-feedback">{feasibilityResult.message}</p>
            ) : null}
            {feasibilityResult?.isCorrect ? <p className="stage-success">{feasibilityResult.message}</p> : null}
            <div className="practice-actions">
              <button type="button" className="panel-action" disabled={exercise.completed} onClick={checkFeasibility}>
                בדיקת היתכנות
              </button>
              <button type="button" className="panel-action secondary" disabled={exercise.completed} onClick={revealFeasibility}>
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          {showInfeasibilityReasonStage ? (
            <StepCard
              stepNumber={2}
              title="סיבת הסתירה"
              status={exercise.infeasibilityReasonStatus}
              locked={infeasibilityReasonLocked}
            >
              <ReconstructionImpossibleReasonInput
                value={impossibleReason}
                disabled={exercise.completed || infeasibilityReasonLocked}
                onChange={(value) => {
                  setImpossibleReason(value);
                  invalidateFromInfeasibilityReasonEdit();
                }}
              />
              {infeasibilityReasonResult && !infeasibilityReasonResult.isCorrect ? (
                <p className="stage-feedback">{infeasibilityReasonResult.message}</p>
              ) : null}
              {infeasibilityReasonResult?.isCorrect ? (
                <p className="stage-success">{infeasibilityReasonResult.message}</p>
              ) : null}
              <div className="practice-actions">
                <button
                  type="button"
                  className="panel-action"
                  disabled={exercise.completed || infeasibilityReasonLocked}
                  onClick={checkInfeasibilityReason}
                >
                  בדיקת הסיבה
                </button>
                <button
                  type="button"
                  className="panel-action secondary"
                  disabled={exercise.completed || infeasibilityReasonLocked}
                  onClick={revealInfeasibilityReason}
                >
                  הצג תשובה לשלב
                </button>
              </div>
            </StepCard>
          ) : null}

          {showFeasibleStages ? (
            <StepCard
              stepNumber={showInfeasibilityReasonStage ? 3 : 2}
              title="שורשים מוכרחים"
              status={exercise.forcedRootsStatus}
              locked={forcedRootsLocked}
            >
              <p className="activity-hint">
                הזינו את השורשים שהפתרונות הנתונים מחייבים ואת הריבוי המינימלי של כל שורש.
              </p>
              <p className="activity-hint">
                סדר המשוואה: {order}. המעלה שהשורשים שהוזנו מחייבים:{" "}
                {enteredForcedDegree ?? "—"} (צפוי לפחות {expectedForcedDegree}).
              </p>
              <PracticeRootGroupEditor
                rootRows={rootRows}
                expectedDegree={expectedForcedDegree}
                disabled={exercise.completed}
                onUpdateRow={(id, field, value) => {
                  setRootRows((current) =>
                    current.map((row) => {
                      if (row.id !== id) {
                        return row;
                      }
                      if (field === "kind") {
                        return {
                          ...row,
                          kind: value as RootGroupDraft["kind"],
                          imagAbs: value === "real" ? "" : row.imagAbs,
                        };
                      }
                      return { ...row, [field]: value };
                    }),
                  );
                  invalidateFromForcedRootsEdit();
                }}
                onAddRow={() => {
                  setRootRows((current) => [
                    ...current,
                    { id: createId(), kind: "real", real: "", imagAbs: "", multiplicity: "1" },
                  ]);
                  invalidateFromForcedRootsEdit();
                }}
                onRemoveRow={(id) => {
                  setRootRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
                  invalidateFromForcedRootsEdit();
                }}
              />
              <details className="intro-expansion">
                <summary>רמז</summary>
                <p>
                  <MathText math={"e^{rx}"} /> מכריח שורש <MathText math="r" />;{" "}
                  <MathText math={"x^ke^{rx}"} /> מכריח ריבוי לפחות <MathText math={"k+1"} />; פתרונות
                  טריגונומטריים מכריחים זוג שורשים מרוכבים.
                </p>
                <RootStageHints />
              </details>
              {rootResult && !rootResult.isCorrect ? (
                <ul className="basis-feedback-list">
                  {rootResult.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              {rootResult?.isCorrect ? <p className="stage-success">רשימת השורשים המוכרחים נכונה.</p> : null}
              <div className="practice-actions">
                <button
                  type="button"
                  className="panel-action"
                  disabled={exercise.completed || forcedRootsLocked}
                  onClick={checkForcedRoots}
                >
                  בדיקת שורשים
                </button>
                <button
                  type="button"
                  className="panel-action secondary"
                  disabled={exercise.completed || forcedRootsLocked}
                  onClick={revealForcedRoots}
                >
                  הצג תשובה לשלב
                </button>
              </div>
            </StepCard>
          ) : null}

          {showFeasibleStages ? (
            <StepCard
              stepNumber={determinationStepNumber}
              title="יחידות המשוואה"
              status={exercise.outcomeStatus}
              locked={determinationLocked}
            >
              <p className="activity-hint">
                האם הנתונים קובעים משוואה מנורמלת יחידה, או שנותר שורש ממשי חופשי אחד?
              </p>
              <ReconstructionDeterminationInput
                value={determination}
                disabled={exercise.completed || determinationLocked}
                onChange={(value) => {
                  setDetermination(value);
                  invalidateFromDeterminationEdit();
                }}
              />
              <details className="intro-expansion">
                <summary>רמז</summary>
                <p>
                  השוו בין המעלה הכוללת של השורשים המוכרחים ({expectedForcedDegree}) לבין סדר המשוואה ({order}).
                </p>
              </details>
              {determinationResult && !determinationResult.isCorrect ? (
                <p className="stage-feedback">{determinationResult.message}</p>
              ) : null}
              {determinationResult?.isCorrect ? <p className="stage-success">{determinationResult.message}</p> : null}
              <div className="practice-actions">
                <button
                  type="button"
                  className="panel-action"
                  disabled={exercise.completed || determinationLocked}
                  onClick={checkDetermination}
                >
                  בדיקת יחידות המשוואה
                </button>
                <button
                  type="button"
                  className="panel-action secondary"
                  disabled={exercise.completed || determinationLocked}
                  onClick={revealDetermination}
                >
                  הצג תשובה לשלב
                </button>
              </div>
            </StepCard>
          ) : null}

          {showFeasibleStages ? (
            <StepCard
              stepNumber={reconstructionStepNumber}
              title="שחזור המשוואה"
              status={exercise.conclusionStatus}
              locked={conclusionLocked}
            >
              {renderConclusionStage()}
              {conclusionResult && !conclusionResult.isCorrect ? (
                conclusionResult.message === "zero-collision-incorrect" ? (
                  <p className="stage-feedback">
                    התנאי שבחרתם אינו מתאים לנתון על התנהגות הפתרונות. שימו לב: אם{" "}
                    <MathText math={"\\lambda=0"} />, השורש <MathText math={"0"} /> יהיה בריבוי גדול
                    מ־<MathText math={"1"} /> ויתקבל פתרון שאינו חסום.
                  </p>
                ) : (
                  <p className="stage-feedback">{conclusionResult.message}</p>
                )
              ) : null}
              {conclusionResult?.isCorrect ? (
                question.analysis.kind === "one-real-parameter" &&
                conclusionResult.message === "lambda-constraint-correct" ? (
                  <p className="stage-success">
                    התנאי שבחרתם עבור <MathText math={"\\lambda"} /> נכון.
                  </p>
                ) : (
                  <p className="stage-success">{conclusionResult.message}</p>
                )
              ) : null}
              <div className="practice-actions">
                <button
                  type="button"
                  className="panel-action"
                  disabled={exercise.completed || conclusionLocked}
                  onClick={checkConclusion}
                >
                  בדיקת שחזור
                </button>
                <button
                  type="button"
                  className="panel-action secondary"
                  disabled={exercise.completed || conclusionLocked}
                  onClick={revealConclusion}
                >
                  הצג תשובה לשלב
                </button>
              </div>
            </StepCard>
          ) : null}
        </div>
      </section>
    </section>
  );
}
