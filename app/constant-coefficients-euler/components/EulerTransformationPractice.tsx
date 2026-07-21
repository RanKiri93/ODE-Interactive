import { useEffect, useMemo, useRef, useState } from "react";
import {
  difficultyLabels,
  emptyQuizStats,
  MAX_DEGREE,
  MIN_PRACTICE_DEGREE,
} from "../constants";
import { formatBasisTokenPreview } from "../math/basis";
import { analyzeStability } from "../math/stability";
import { compareBasisTokens } from "../practice/answerEvaluation";
import {
  basisEntriesFromTokens,
  defaultBasisEntries,
  tokensFromBasisEntries,
} from "../practice/basisComposer";
import { buildEulerTransformationPracticeQuestion } from "../practice/eulerQuestionGeneration";
import {
  coefficientFieldStatus,
  defaultPolynomialDraft,
  evaluatePolynomialAnswer,
  polynomialDraftFromCoefficients,
} from "../practice/polynomialEvaluation";
import {
  compareRootGroups,
  defaultRootGroupDrafts,
  rootGroupDraftsFromGroups,
} from "../practice/rootEvaluation";
import {
  createInitialEulerExerciseState,
  recordAbandonedQuestion,
  recordAssistedCompletion,
  recordIndependentCompletion,
  recordQuestionStarted,
} from "../practice/stats";
import {
  defaultStabilityAnswer,
  evaluateStabilityAnswer,
  stabilityAnswerFromAnalysis,
} from "../practice/stabilityEvaluation";
import type {
  BasisCheckResult,
  CoefficientFieldStatus,
  Difficulty,
  EulerTransformationExerciseState,
  PolynomialEvaluationResult,
  RootComparisonResult,
  RootGroupDraft,
  StabilityAnswerInput,
  StabilityEvaluationResult,
} from "../types";
import type { BasisToken } from "../types";
import { createId } from "../utils/id";
import { ConstantBasisComposer } from "./ConstantBasisComposer";
import { DifferentialEquationCoefficientEditor } from "./DifferentialEquationCoefficientEditor";
import { MathText } from "./MathText";
import { PolynomialCoefficientEditor } from "./PolynomialCoefficientEditor";
import { PracticeRootGroupEditor, RootStageHints } from "./PracticeRootGroupEditor";
import { PracticeStats } from "./PracticeStats";
import { StabilityStage } from "./StabilityStage";
import { StepCard } from "./StepCard";

function resetAnswerState(degree: number) {
  return {
    polyCoeffs: defaultPolynomialDraft(degree),
    transformedCoeffs: defaultPolynomialDraft(degree),
    rootRows: defaultRootGroupDrafts(1),
    uBasisEntries: defaultBasisEntries(),
    yBasisEntries: defaultBasisEntries(),
    stabilityAnswer: defaultStabilityAnswer(),
    exercise: createInitialEulerExerciseState(),
    polyResult: null as PolynomialEvaluationResult | null,
    transformedResult: null as PolynomialEvaluationResult | null,
    rootResult: null as RootComparisonResult | null,
    uBasisParseErrors: [] as string[],
    uBasisResult: null as BasisCheckResult | null,
    yBasisParseErrors: [] as string[],
    yBasisResult: null as BasisCheckResult | null,
    stabilityResult: null as StabilityEvaluationResult | null,
  };
}

function describeEulerFlow(includeStability: boolean): string {
  const stages = [
    "פולינום אופייני",
    "משוואה עבור u(t)",
    "שורשים",
    "בסיס עבור u(t)",
    "בסיס עבור y(x)",
  ];
  if (includeStability) {
    stages.push("יציבות");
  }
  return stages.join(", ");
}

function formatBasisBraceLatex(
  tokens: readonly BasisToken[],
  context: "constant-t" | "euler-x",
  prefix?: string,
): string {
  if (tokens.length === 0) {
    return prefix ? `${prefix}=\\left\\{\\ \\right\\}` : "\\left\\{\\ \\right\\}";
  }
  const parts = tokens.map((token) => formatBasisTokenPreview(token, context));
  const body = `\\left\\{${parts.join(",\\ ")}\\right\\}`;
  return prefix ? `${prefix}=${body}` : body;
}

export function EulerTransformationPractice() {
  const [degree, setDegree] = useState(MIN_PRACTICE_DEGREE);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [seed, setSeed] = useState(104138);
  const [includeStability, setIncludeStability] = useState(true);
  const [activeIncludeStability, setActiveIncludeStability] = useState(true);
  const [stats, setStats] = useState(emptyQuizStats);

  const [polyCoeffs, setPolyCoeffs] = useState(() => defaultPolynomialDraft(MIN_PRACTICE_DEGREE));
  const [transformedCoeffs, setTransformedCoeffs] = useState(() =>
    defaultPolynomialDraft(MIN_PRACTICE_DEGREE),
  );
  const [rootRows, setRootRows] = useState<RootGroupDraft[]>(() => defaultRootGroupDrafts(1));
  const [uBasisEntries, setUBasisEntries] = useState(() => defaultBasisEntries());
  const [yBasisEntries, setYBasisEntries] = useState(() => defaultBasisEntries());
  const [stabilityAnswer, setStabilityAnswer] = useState<StabilityAnswerInput>(defaultStabilityAnswer);
  const [exercise, setExercise] = useState<EulerTransformationExerciseState>(createInitialEulerExerciseState);

  const [polyResult, setPolyResult] = useState<PolynomialEvaluationResult | null>(null);
  const [transformedResult, setTransformedResult] = useState<PolynomialEvaluationResult | null>(null);
  const [rootResult, setRootResult] = useState<RootComparisonResult | null>(null);
  const [uBasisParseErrors, setUBasisParseErrors] = useState<string[]>([]);
  const [uBasisResult, setUBasisResult] = useState<BasisCheckResult | null>(null);
  const [yBasisParseErrors, setYBasisParseErrors] = useState<string[]>([]);
  const [yBasisResult, setYBasisResult] = useState<BasisCheckResult | null>(null);
  const [stabilityResult, setStabilityResult] = useState<StabilityEvaluationResult | null>(null);

  const initialStartedRef = useRef(false);

  const question = useMemo(
    () => buildEulerTransformationPracticeQuestion(degree, difficulty, seed),
    [degree, difficulty, seed],
  );

  useEffect(() => {
    if (!initialStartedRef.current) {
      initialStartedRef.current = true;
      setStats((current) => recordQuestionStarted(current));
    }
  }, []);

  const transformedLocked = !exercise.transformedEquationEverUnlocked;
  const rootsLocked = !exercise.rootsEverUnlocked;
  const uBasisLocked = !exercise.uBasisEverUnlocked;
  const yBasisLocked = !exercise.yBasisEverUnlocked;
  const stabilityLocked = !exercise.stabilityEverUnlocked;
  const stabilityStepNumber = 6;

  const uBasisSummaryLatex = useMemo(
    () => formatBasisBraceLatex(tokensFromBasisEntries(uBasisEntries), "constant-t", "\\mathcal B_u"),
    [uBasisEntries],
  );

  const completionUBasisLatex = useMemo(
    () => formatBasisBraceLatex(question.expectedBasis, "constant-t", "\\mathcal B_u"),
    [question.expectedBasis],
  );

  const completionYBasisLatex = useMemo(
    () => formatBasisBraceLatex(question.expectedBasis, "euler-x", "\\mathcal B_y"),
    [question.expectedBasis],
  );

  const cancelCompletion = () => ({
    completed: false,
    completionKind: "none" as const,
  });

  const clearStabilityFeedback = () => {
    setStabilityResult(null);
  };

  const invalidateFromPolynomialEdit = () => {
    setExercise((current) => ({
      ...current,
      polynomialStatus: "unanswered",
      transformedEquationStatus: current.transformedEquationEverUnlocked ? "unanswered" : "locked",
      rootsStatus: current.rootsEverUnlocked ? "unanswered" : "locked",
      uBasisStatus: current.uBasisEverUnlocked ? "unanswered" : "locked",
      yBasisStatus: current.yBasisEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setPolyResult(null);
    setTransformedResult(null);
    setRootResult(null);
    setUBasisParseErrors([]);
    setUBasisResult(null);
    setYBasisParseErrors([]);
    setYBasisResult(null);
    clearStabilityFeedback();
  };

  const invalidateFromTransformedEdit = () => {
    setExercise((current) => ({
      ...current,
      transformedEquationStatus: "unanswered",
      rootsStatus: current.rootsEverUnlocked ? "unanswered" : "locked",
      uBasisStatus: current.uBasisEverUnlocked ? "unanswered" : "locked",
      yBasisStatus: current.yBasisEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setTransformedResult(null);
    setRootResult(null);
    setUBasisParseErrors([]);
    setUBasisResult(null);
    setYBasisParseErrors([]);
    setYBasisResult(null);
    clearStabilityFeedback();
  };

  const invalidateFromRootsEdit = () => {
    setExercise((current) => ({
      ...current,
      rootsStatus: "unanswered",
      uBasisStatus: current.uBasisEverUnlocked ? "unanswered" : "locked",
      yBasisStatus: current.yBasisEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setRootResult(null);
    setUBasisParseErrors([]);
    setUBasisResult(null);
    setYBasisParseErrors([]);
    setYBasisResult(null);
    clearStabilityFeedback();
  };

  const invalidateFromUBasisEdit = () => {
    setExercise((current) => ({
      ...current,
      uBasisStatus: "unanswered",
      yBasisStatus: current.yBasisEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setUBasisParseErrors([]);
    setUBasisResult(null);
    setYBasisParseErrors([]);
    setYBasisResult(null);
    clearStabilityFeedback();
  };

  const invalidateFromYBasisEdit = () => {
    setExercise((current) => ({
      ...current,
      yBasisStatus: "unanswered",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      ...cancelCompletion(),
    }));
    setYBasisParseErrors([]);
    setYBasisResult(null);
    clearStabilityFeedback();
  };

  const invalidateFromStabilityEdit = () => {
    setExercise((current) => ({
      ...current,
      stabilityStatus: "unanswered",
      ...cancelCompletion(),
    }));
    clearStabilityFeedback();
  };

  const applyCompletion = (assisted: boolean) => {
    if (exercise.completed) {
      return;
    }
    setExercise((current) => ({
      ...current,
      completed: true,
      completionKind: assisted ? "assisted" : "independent",
      yBasisStatus: activeIncludeStability ? current.yBasisStatus : assisted ? "revealed" : "correct",
      stabilityStatus: activeIncludeStability
        ? assisted
          ? "revealed"
          : "correct"
        : current.stabilityStatus,
    }));
    setStats((statsCurrent) =>
      assisted ? recordAssistedCompletion(statsCurrent) : recordIndependentCompletion(statsCurrent),
    );
  };

  const unlockStabilityStage = () => {
    if (!activeIncludeStability) {
      return;
    }
    setExercise((current) => ({
      ...current,
      stabilityStatus: current.stabilityEverUnlocked ? current.stabilityStatus : "unanswered",
      stabilityEverUnlocked: true,
    }));
  };

  const clearAnswerOnly = (nextDegree = degree) => {
    const reset = resetAnswerState(nextDegree);
    setPolyCoeffs(reset.polyCoeffs);
    setTransformedCoeffs(reset.transformedCoeffs);
    setRootRows(reset.rootRows);
    setUBasisEntries(reset.uBasisEntries);
    setYBasisEntries(reset.yBasisEntries);
    setStabilityAnswer(reset.stabilityAnswer);
    setExercise(reset.exercise);
    setPolyResult(reset.polyResult);
    setTransformedResult(reset.transformedResult);
    setRootResult(reset.rootResult);
    setUBasisParseErrors(reset.uBasisParseErrors);
    setUBasisResult(reset.uBasisResult);
    setYBasisParseErrors(reset.yBasisParseErrors);
    setYBasisResult(reset.yBasisResult);
    setStabilityResult(reset.stabilityResult);
  };

  const beginQuestion = ({
    seedStep,
    nextDegree = degree,
    nextDifficulty = difficulty,
    nextIncludeStability = includeStability,
    abandonIncomplete = false,
  }: {
    seedStep: number;
    nextDegree?: number;
    nextDifficulty?: Difficulty;
    nextIncludeStability?: boolean;
    abandonIncomplete?: boolean;
  }) => {
    if (abandonIncomplete && !exercise.completed) {
      setStats((current) => recordAbandonedQuestion(current));
    }
    setDegree(nextDegree);
    setDifficulty(nextDifficulty);
    setIncludeStability(nextIncludeStability);
    setActiveIncludeStability(nextIncludeStability);
    setSeed((current) => current + seedStep);
    clearAnswerOnly(nextDegree);
    setStats((current) => recordQuestionStarted(current));
  };

  const checkPolynomial = () => {
    if (exercise.completed) {
      return;
    }
    const result = evaluatePolynomialAnswer(polyCoeffs, question.characteristicPolynomialCoefficients);
    setPolyResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({
        ...current,
        polynomialStatus: "correct",
        transformedEquationStatus: current.transformedEquationEverUnlocked
          ? current.transformedEquationStatus
          : "unanswered",
        transformedEquationEverUnlocked: true,
      }));
    } else {
      setExercise((current) => ({ ...current, polynomialStatus: "incorrect" }));
    }
  };

  const revealPolynomial = () => {
    setPolyCoeffs(polynomialDraftFromCoefficients(question.characteristicPolynomialCoefficients));
    setPolyResult({
      isCorrect: true,
      emptyIndexes: [],
      invalidIndexes: [],
      incorrectIndexes: [],
      errors: [],
      coefficients: question.characteristicPolynomialCoefficients,
    });
    setExercise((current) => ({
      ...current,
      polynomialStatus: "revealed",
      transformedEquationStatus: current.transformedEquationEverUnlocked
        ? current.transformedEquationStatus
        : "unanswered",
      transformedEquationEverUnlocked: true,
      usedReveal: true,
    }));
  };

  const checkTransformedEquation = () => {
    if (exercise.completed || transformedLocked) {
      return;
    }
    const result = evaluatePolynomialAnswer(
      transformedCoeffs,
      question.characteristicPolynomialCoefficients,
    );
    setTransformedResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({
        ...current,
        transformedEquationStatus: "correct",
        rootsStatus: current.rootsEverUnlocked ? current.rootsStatus : "unanswered",
        rootsEverUnlocked: true,
      }));
    } else {
      setExercise((current) => ({ ...current, transformedEquationStatus: "incorrect" }));
    }
  };

  const revealTransformedEquation = () => {
    setTransformedCoeffs(polynomialDraftFromCoefficients(question.characteristicPolynomialCoefficients));
    setTransformedResult({
      isCorrect: true,
      emptyIndexes: [],
      invalidIndexes: [],
      incorrectIndexes: [],
      errors: [],
      coefficients: question.characteristicPolynomialCoefficients,
    });
    setExercise((current) => ({
      ...current,
      transformedEquationStatus: "revealed",
      rootsStatus: current.rootsEverUnlocked ? current.rootsStatus : "unanswered",
      rootsEverUnlocked: true,
      usedReveal: true,
    }));
  };

  const checkRoots = () => {
    if (exercise.completed || rootsLocked) {
      return;
    }
    const result = compareRootGroups(rootRows, question.roots, question.degree);
    setRootResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({
        ...current,
        rootsStatus: "correct",
        uBasisStatus: current.uBasisEverUnlocked ? current.uBasisStatus : "unanswered",
        uBasisEverUnlocked: true,
      }));
    } else {
      setExercise((current) => ({ ...current, rootsStatus: "incorrect" }));
    }
  };

  const revealRoots = () => {
    setRootRows(rootGroupDraftsFromGroups(question.roots));
    setRootResult({
      isCorrect: true,
      invalidGroups: [],
      degreeMismatch: false,
      enteredDegree: question.degree,
      expectedDegree: question.degree,
      missing: [],
      extra: [],
      multiplicityMismatches: [],
      errors: [],
      groups: question.roots,
    });
    setExercise((current) => ({
      ...current,
      rootsStatus: "revealed",
      uBasisStatus: current.uBasisEverUnlocked ? current.uBasisStatus : "unanswered",
      uBasisEverUnlocked: true,
      usedReveal: true,
    }));
  };

  const checkUBasis = () => {
    if (exercise.completed || uBasisLocked) {
      return;
    }

    const tokens = tokensFromBasisEntries(uBasisEntries);
    if (tokens.length !== degree) {
      setUBasisParseErrors([`יש להזין ${degree} איברי בסיס.`]);
      setUBasisResult(null);
      setExercise((current) => ({ ...current, uBasisStatus: "incorrect" }));
      return;
    }

    const result = compareBasisTokens(question.expectedBasis, tokens, "constant-t");
    setUBasisParseErrors([]);
    setUBasisResult(result);

    if (result.isCorrect) {
      setExercise((current) => ({
        ...current,
        uBasisStatus: "correct",
        yBasisStatus: current.yBasisEverUnlocked ? current.yBasisStatus : "unanswered",
        yBasisEverUnlocked: true,
      }));
    } else {
      setExercise((current) => ({ ...current, uBasisStatus: "incorrect" }));
    }
  };

  const revealUBasis = () => {
    setUBasisEntries(basisEntriesFromTokens(question.expectedBasis));
    setUBasisParseErrors([]);
    setUBasisResult({
      isCorrect: true,
      missing: [],
      extra: [],
      errors: [],
    });
    setExercise((current) => ({
      ...current,
      uBasisStatus: "revealed",
      yBasisStatus: current.yBasisEverUnlocked ? current.yBasisStatus : "unanswered",
      yBasisEverUnlocked: true,
      usedReveal: true,
    }));
  };

  const checkYBasis = () => {
    if (exercise.completed || yBasisLocked) {
      return;
    }

    const tokens = tokensFromBasisEntries(yBasisEntries);
    if (tokens.length !== degree) {
      setYBasisParseErrors([`יש להזין ${degree} איברי בסיס.`]);
      setYBasisResult(null);
      setExercise((current) => ({ ...current, yBasisStatus: "incorrect" }));
      return;
    }

    const result = compareBasisTokens(question.expectedBasis, tokens, "euler-x");
    setYBasisParseErrors([]);
    setYBasisResult(result);

    if (result.isCorrect) {
      setExercise((current) => ({ ...current, yBasisStatus: "correct" }));
      if (activeIncludeStability) {
        unlockStabilityStage();
      } else {
        applyCompletion(exercise.usedReveal);
      }
    } else {
      setExercise((current) => ({ ...current, yBasisStatus: "incorrect" }));
    }
  };

  const revealYBasis = () => {
    setYBasisEntries(basisEntriesFromTokens(question.expectedBasis));
    setYBasisParseErrors([]);
    setYBasisResult({
      isCorrect: true,
      missing: [],
      extra: [],
      errors: [],
    });
    setExercise((current) => ({
      ...current,
      yBasisStatus: "revealed",
      usedReveal: true,
    }));
    if (activeIncludeStability) {
      unlockStabilityStage();
    } else {
      applyCompletion(true);
    }
  };

  const checkStability = () => {
    if (exercise.completed || stabilityLocked || !activeIncludeStability) {
      return;
    }
    const result = evaluateStabilityAnswer(stabilityAnswer, question.roots);
    setStabilityResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, stabilityStatus: "correct" }));
      applyCompletion(exercise.usedReveal);
    } else {
      setExercise((current) => ({ ...current, stabilityStatus: "incorrect" }));
    }
  };

  const revealStability = () => {
    const analysis = analyzeStability(question.roots);
    const answer = stabilityAnswerFromAnalysis(analysis);
    setStabilityAnswer(answer);
    setStabilityResult(evaluateStabilityAnswer(answer, question.roots));
    setExercise((current) => ({
      ...current,
      stabilityStatus: "revealed",
      usedReveal: true,
    }));
    applyCompletion(true);
  };

  const polyFieldStatuses: CoefficientFieldStatus[] = polyCoeffs.map((_, index) =>
    coefficientFieldStatus(index, polyResult),
  );
  const transformedFieldStatuses: CoefficientFieldStatus[] = transformedCoeffs.map((_, index) =>
    coefficientFieldStatus(index, transformedResult),
  );

  return (
    <section className="practice-grid equation-practice-grid full-practice-grid" aria-label="תרגול מעבר אוילר">
      <aside className="control-panel practice-panel">
        <section className="panel-section">
          <div className="section-heading">מעלה</div>
          <div className="segmented-control">
            {Array.from({ length: MAX_DEGREE - MIN_PRACTICE_DEGREE + 1 }, (_, index) => {
              const option = index + MIN_PRACTICE_DEGREE;
              return (
                <button
                  key={option}
                  className={degree === option ? "selected" : ""}
                  type="button"
                  onClick={() => beginQuestion({ seedStep: option * 5, nextDegree: option, abandonIncomplete: true })}
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
                    seedStep: option === "easy" ? 103 : option === "medium" ? 217 : 311,
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
          <label className="stability-toggle">
            <input
              type="checkbox"
              checked={includeStability}
              onChange={(event) =>
                beginQuestion({
                  seedStep: event.target.checked ? 401 : 409,
                  nextIncludeStability: event.target.checked,
                  abandonIncomplete: true,
                })
              }
            />
            <span>כלול שלב יציבות</span>
          </label>
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
        <div className="practice-question-card euler-question-card">
          <p className="course-kicker">
            Seed {seed} · {difficultyLabels[difficulty]} · משוואת אוילר · מעלה {degree}
          </p>
          <h2 className="euler-activity-title">
            פתרון משוואת אוילר באמצעות <MathText math="t=\ln x" />
          </h2>
          <p className="activity-hint euler-activity-flow">
            פתרו את המשוואה ב{describeEulerFlow(activeIncludeStability)}.
          </p>

          <p className="intro-equation" dir="ltr">
            <MathText block math={`${question.eulerEquationLatex},\\quad x>0`} />
          </p>

          <section className="euler-transform-strip" aria-label="הצבה">
            <div className="euler-transform-strip-heading">ההצבה שבה נשתמש:</div>
            <div className="euler-transform-strip-content" dir="ltr">
              <MathText block math="t=\ln x,\qquad u(t)=y(e^t),\qquad y(x)=u(\ln x)" />
            </div>
          </section>
        </div>

        {exercise.completed ? (
          <section
            className={`result-card primary full-practice-completion euler-completion-card ${exercise.completionKind === "assisted" ? "assisted" : "independent"}`}
          >
            <strong>
              {exercise.completionKind === "independent"
                ? "כל הכבוד — השלמת נכון את כל שלבי הפתרון."
                : "התרגיל הושלם בעזרת הצגת תשובה."}
            </strong>
            <div className="full-practice-summary euler-completion-summary">
              <div className="section-heading">סיכום הפתרון</div>
              <div className="euler-summary-formula-scroll">
                <p className="intro-equation euler-summary-formula">
                  <MathText block math={`p(r)=${question.characteristicPolynomialLatex}`} />
                </p>
              </div>
              <p className="euler-summary-label">המשוואה עבור u(t):</p>
              <div className="euler-summary-formula-scroll">
                <p className="intro-equation euler-summary-formula">
                  <MathText block math={question.constantCoefficientEquationLatex} />
                </p>
              </div>
              <div className="euler-summary-formula-scroll">
                <p className="intro-equation euler-summary-formula">
                  <MathText block math={completionUBasisLatex} />
                </p>
              </div>
              <div className="euler-summary-formula-scroll">
                <p className="intro-equation euler-summary-formula">
                  <MathText block math={completionYBasisLatex} />
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="full-practice-steps">
          <StepCard stepNumber={1} title="הפולינום האופייני" status={exercise.polynomialStatus} locked={false}>
            <p className="activity-hint">
              הזינו את <MathText math="p(r)" /> בבסיס החזקות הרגיל, כאשר{" "}
              <MathText math="x^ky^{(k)}\longleftrightarrow r^{\underline{k}}" />.
            </p>
            <PolynomialCoefficientEditor
              degree={degree}
              coefficients={polyCoeffs}
              fieldStatuses={polyFieldStatuses}
              disabled={exercise.completed}
              onChange={(index, value) => {
                setPolyCoeffs((current) => current.map((item, idx) => (idx === index ? value : item)));
                invalidateFromPolynomialEdit();
              }}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>
                היעזרו בהצבה <MathText math="y(x)=x^r" />.
              </p>
              <p>
                לכל <MathText math="k\ge1" />, ההצבה <MathText math="y(x)=x^r" /> נותנת{" "}
                <MathText block math={"x^ky^{(k)}=r(r-1)\\cdots(r-k+1)x^r"} />.
              </p>
            </details>
            {polyResult && !polyResult.isCorrect ? (
              <ul className="basis-feedback-list">
                {polyResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {polyResult?.isCorrect ? <p className="stage-success">הפולינום נכון.</p> : null}
            <div className="practice-actions">
              <button type="button" className="panel-action" disabled={exercise.completed} onClick={checkPolynomial}>
                בדיקת הפולינום
              </button>
              <button type="button" className="panel-action secondary" disabled={exercise.completed} onClick={revealPolynomial}>
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          <StepCard
            stepNumber={2}
            title={
              <span className="euler-stage-title-line">
                המשוואה עבור <MathText math="u(t)" />
              </span>
            }
            status={exercise.transformedEquationStatus}
            locked={transformedLocked}
          >
            <p className="activity-hint euler-relation-note">
              <MathText block math={"p(r)=a_nr^n+\\cdots+a_0"} />
              {" "}
              <MathText block math={"\\Longrightarrow\\ p(D)u=0"} />
              ,{" "}
              <MathText size="standard" math={"D=\\frac{d}{dt}"} />.
            </p>
            <DifferentialEquationCoefficientEditor
              degree={degree}
              coefficients={transformedCoeffs}
              fieldStatuses={transformedFieldStatuses}
              disabled={exercise.completed}
              dependentVariable="u"
              onChange={(index, value) => {
                setTransformedCoeffs((current) => current.map((item, idx) => (idx === index ? value : item)));
                invalidateFromTransformedEdit();
              }}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>
                החליפו כל חזקה <MathText math="r^k" /> בפולינום האופייני בנגזרת{" "}
                <MathText math={"u^{(k)}"} />.
              </p>
            </details>
            {transformedResult && !transformedResult.isCorrect ? (
              <ul className="basis-feedback-list">
                {transformedResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {transformedResult?.isCorrect ? <p className="stage-success">המשוואה עבור u(t) נכונה.</p> : null}
            <div className="practice-actions">
              <button
                type="button"
                className="panel-action"
                disabled={exercise.completed || transformedLocked}
                onClick={checkTransformedEquation}
              >
                בדיקת המשוואה
              </button>
              <button
                type="button"
                className="panel-action secondary"
                disabled={exercise.completed || transformedLocked}
                onClick={revealTransformedEquation}
              >
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          <StepCard stepNumber={3} title="שורשים וריבויים" status={exercise.rootsStatus} locked={rootsLocked}>
            <PracticeRootGroupEditor
              rootRows={rootRows}
              expectedDegree={degree}
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
                invalidateFromRootsEdit();
              }}
              onAddRow={() => {
                setRootRows((current) => [
                  ...current,
                  { id: createId(), kind: "real", real: "", imagAbs: "", multiplicity: "1" },
                ]);
                invalidateFromRootsEdit();
              }}
              onRemoveRow={(id) => {
                setRootRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
                invalidateFromRootsEdit();
              }}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>מצאו את שורשי הפולינום האופייני שחישבתם בשלב 1.</p>
              <details className="intro-sub-expansion">
                <summary>רמז חזק: פירוק לגורמים</summary>
                <p className="intro-equation">
                  <MathText block math={`p(r)=${question.factoredPolynomialLatex}`} />
                </p>
              </details>
              <RootStageHints />
            </details>
            {rootResult && !rootResult.isCorrect ? (
              <ul className="basis-feedback-list">
                {rootResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {rootResult?.isCorrect ? <p className="stage-success">רשימת השורשים נכונה.</p> : null}
            <div className="practice-actions">
              <button type="button" className="panel-action" disabled={exercise.completed || rootsLocked} onClick={checkRoots}>
                בדיקת שורשים
              </button>
              <button type="button" className="panel-action secondary" disabled={exercise.completed || rootsLocked} onClick={revealRoots}>
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          <StepCard
            stepNumber={4}
            title={
              <span className="euler-stage-title-line">
                בסיס עבור <MathText math="u(t)" />
              </span>
            }
            status={exercise.uBasisStatus}
            locked={uBasisLocked}
          >
            <p className="activity-hint">
              הזינו בסיס ממשי סטנדרטי עבור <MathText math="u(t)" />.
            </p>
            <ConstantBasisComposer
              entries={uBasisEntries}
              displayContext="constant-t"
              expectedCount={degree}
              disabled={exercise.completed}
              onChange={(entries) => {
                setUBasisEntries(entries);
                invalidateFromUBasisEdit();
              }}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>
                שורש ממשי <MathText math="r" /> מריבוי <MathText math="m" /> מוסיף{" "}
                <MathText math={"e^{rt}, te^{rt}, \\ldots, t^{m-1}e^{rt}"} />.
              </p>
              <p>
                זוג מרוכב <MathText math={"\\alpha\\pm i\\beta"} /> מריבוי <MathText math="m" /> מוסיף{" "}
                <MathText math={"t^ke^{\\alpha t}\\cos(\\beta t)"} /> ו-<MathText math={"t^ke^{\\alpha t}\\sin(\\beta t)"} />{" "}
                לכל <MathText math="k=0,\ldots,m-1" />.
              </p>
            </details>
            {uBasisParseErrors.length > 0 ? (
              <ul className="basis-feedback-list">
                {uBasisParseErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {uBasisResult && !uBasisResult.isCorrect ? (
              <ul className="basis-feedback-list">
                {uBasisResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {uBasisResult?.isCorrect ? <p className="stage-success">הבסיס עבור u(t) נכון.</p> : null}
            <div className="practice-actions">
              <button type="button" className="panel-action" disabled={exercise.completed || uBasisLocked} onClick={checkUBasis}>
                בדיקת בסיס
              </button>
              <button type="button" className="panel-action secondary" disabled={exercise.completed || uBasisLocked} onClick={revealUBasis}>
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          <StepCard
            stepNumber={5}
            title={
              <span className="euler-stage-title-line">
                בסיס עבור <MathText math="y(x)" />
              </span>
            }
            status={exercise.yBasisStatus}
            locked={yBasisLocked}
          >
            {!yBasisLocked ? (
              <section className="euler-basis-transition" aria-label="מעבר מ-u(t) ל-y(x)">
                <div className="euler-transition-heading">
                  הבסיס שמצאתם עבור <MathText math="u(t)" />:
                </div>
                <div className="basis-brace-display-scroll">
                  <p className="intro-equation basis-brace-display" dir="ltr">
                    <MathText block math={uBasisSummaryLatex} />
                  </p>
                </div>
                <div className="euler-transition-heading">
                  כעת הציבו <MathText math="t=\ln x" />:
                </div>
                <div className="euler-transform-rules" dir="ltr">
                  <MathText size="compact" math={"e^{rt}\\mapsto x^r"} />
                  <MathText size="compact" math={"t^k\\mapsto(\\ln x)^k"} />
                  <MathText size="compact" math={"\\cos(\\beta t)\\mapsto\\cos(\\beta\\ln x)"} />
                  <MathText size="compact" math={"\\sin(\\beta t)\\mapsto\\sin(\\beta\\ln x)"} />
                </div>
              </section>
            ) : null}

            <ConstantBasisComposer
              entries={yBasisEntries}
              displayContext="euler-x"
              expectedCount={degree}
              disabled={exercise.completed}
              onChange={(entries) => {
                setYBasisEntries(entries);
                invalidateFromYBasisEdit();
              }}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>
                החליפו <MathText math="t=\ln x" /> בכל איברי הבסיס שמצאתם עבור <MathText math="u(t)" />.
              </p>
            </details>
            {yBasisParseErrors.length > 0 ? (
              <ul className="basis-feedback-list">
                {yBasisParseErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {yBasisResult && !yBasisResult.isCorrect ? (
              <ul className="basis-feedback-list">
                {yBasisResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {yBasisResult?.isCorrect ? <p className="stage-success">הבסיס עבור y(x) נכון.</p> : null}
            <div className="practice-actions">
              <button type="button" className="panel-action" disabled={exercise.completed || yBasisLocked} onClick={checkYBasis}>
                בדיקת בסיס
              </button>
              <button type="button" className="panel-action secondary" disabled={exercise.completed || yBasisLocked} onClick={revealYBasis}>
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          {activeIncludeStability ? (
            <StepCard
              stepNumber={stabilityStepNumber}
              title={
                <span className="stability-stage-title-line">
                  יציבות כאשר <MathText math={"x\\to\\infty"} />
                </span>
              }
              status={exercise.stabilityStatus}
              locked={stabilityLocked}
              variant="stability"
            >
              <StabilityStage
                equationKind="euler"
                roots={question.roots}
                value={stabilityAnswer}
                evaluationResult={stabilityResult}
                disabled={exercise.completed || stabilityLocked}
                revealed={exercise.stabilityStatus === "revealed"}
                onChange={(value) => {
                  setStabilityAnswer(value);
                  invalidateFromStabilityEdit();
                }}
                onCheck={checkStability}
                onReveal={revealStability}
              />
            </StepCard>
          ) : null}
        </div>
      </section>
    </section>
  );
}
