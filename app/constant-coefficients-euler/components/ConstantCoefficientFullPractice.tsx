import { useEffect, useMemo, useRef, useState } from "react";
import {
  difficultyLabels,
  emptyQuizStats,
  MAX_DEGREE,
  MAX_INITIAL_CONDITION_DEGREE,
  MIN_PRACTICE_DEGREE,
} from "../constants";
import { formatRootGroupHint } from "../math/basis";
import { analyzeStability } from "../math/stability";
import {
  compareBasisTokens,
} from "../practice/answerEvaluation";
import {
  basisEntriesFromTokens,
  defaultBasisEntries,
  tokensFromBasisEntries,
} from "../practice/basisComposer";
import {
  defaultInitialCoefficientDraft,
  evaluateInitialCoefficientAnswer,
  initialCoefficientDraftFromValues,
  initialCoefficientFieldStatus,
} from "../practice/initialConditionEvaluation";
import {
  coefficientFieldStatus,
  defaultPolynomialDraft,
  evaluatePolynomialAnswer,
  polynomialDraftFromCoefficients,
} from "../practice/polynomialEvaluation";
import { buildConstantCoefficientPracticeQuestion } from "../practice/questionGeneration";
import {
  compareRootGroups,
  defaultRootGroupDrafts,
  rootGroupDraftsFromGroups,
} from "../practice/rootEvaluation";
import {
  createInitialExerciseState,
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
  FullSolutionExerciseState,
  InitialCoefficientEvaluationResult,
  PolynomialEvaluationResult,
  RootComparisonResult,
  RootGroupDraft,
  StabilityAnswerInput,
  StabilityEvaluationResult,
} from "../types";
import { createId } from "../utils/id";
import { ConstantBasisComposer } from "./ConstantBasisComposer";
import { MathText } from "./MathText";
import { PolynomialCoefficientEditor } from "./PolynomialCoefficientEditor";
import { PracticeRootGroupEditor, RootStageHints } from "./PracticeRootGroupEditor";
import { PracticeStats } from "./PracticeStats";
import { InitialConditionsStage } from "./InitialConditionsStage";
import { StabilityStage } from "./StabilityStage";
import { StepCard } from "./StepCard";

function resetAnswerState(degree: number) {
  return {
    polyCoeffs: defaultPolynomialDraft(degree),
    rootRows: defaultRootGroupDrafts(1),
    basisEntries: defaultBasisEntries(),
    initialCoeffs: defaultInitialCoefficientDraft(degree),
    stabilityAnswer: defaultStabilityAnswer(),
    exercise: createInitialExerciseState(),
    polyResult: null as PolynomialEvaluationResult | null,
    rootResult: null as RootComparisonResult | null,
    basisParseErrors: [] as string[],
    basisResult: null as BasisCheckResult | null,
    initialConditionsResult: null as InitialCoefficientEvaluationResult | null,
    stabilityResult: null as StabilityEvaluationResult | null,
  };
}

function resolveIncludeInitialConditions(degree: number, includeInitialConditions: boolean): boolean {
  return includeInitialConditions && degree <= MAX_INITIAL_CONDITION_DEGREE;
}

function describePracticeFlow(includeInitialConditions: boolean, includeStability: boolean): string {
  const stages = ["פולינום אופייני", "שורשים", "בסיס"];
  if (includeInitialConditions) {
    stages.push("תנאי התחלה");
  }
  if (includeStability) {
    stages.push("יציבות");
  }
  return stages.join(", ");
}

export function ConstantCoefficientFullPractice() {
  const [degree, setDegree] = useState(MIN_PRACTICE_DEGREE);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [seed, setSeed] = useState(104137);
  const [includeStability, setIncludeStability] = useState(true);
  const [activeIncludeStability, setActiveIncludeStability] = useState(true);
  const [includeInitialConditions, setIncludeInitialConditions] = useState(false);
  const [activeIncludeInitialConditions, setActiveIncludeInitialConditions] = useState(false);
  const [stats, setStats] = useState(emptyQuizStats);

  const [polyCoeffs, setPolyCoeffs] = useState(() => defaultPolynomialDraft(MIN_PRACTICE_DEGREE));
  const [rootRows, setRootRows] = useState<RootGroupDraft[]>(() => defaultRootGroupDrafts(1));
  const [basisEntries, setBasisEntries] = useState(() => defaultBasisEntries());
  const [initialCoeffs, setInitialCoeffs] = useState(() => defaultInitialCoefficientDraft(MIN_PRACTICE_DEGREE));
  const [stabilityAnswer, setStabilityAnswer] = useState<StabilityAnswerInput>(defaultStabilityAnswer);
  const [exercise, setExercise] = useState<FullSolutionExerciseState>(createInitialExerciseState);

  const [polyResult, setPolyResult] = useState<PolynomialEvaluationResult | null>(null);
  const [rootResult, setRootResult] = useState<RootComparisonResult | null>(null);
  const [basisParseErrors, setBasisParseErrors] = useState<string[]>([]);
  const [basisResult, setBasisResult] = useState<BasisCheckResult | null>(null);
  const [initialConditionsResult, setInitialConditionsResult] = useState<InitialCoefficientEvaluationResult | null>(null);
  const [stabilityResult, setStabilityResult] = useState<StabilityEvaluationResult | null>(null);

  const initialStartedRef = useRef(false);

  const question = useMemo(
    () =>
      buildConstantCoefficientPracticeQuestion(degree, difficulty, seed, {
        includeInitialConditions: activeIncludeInitialConditions,
      }),
    [degree, difficulty, seed, activeIncludeInitialConditions],
  );

  useEffect(() => {
    if (!initialStartedRef.current) {
      initialStartedRef.current = true;
      setStats((current) => recordQuestionStarted(current));
    }
  }, []);

  const rootsLocked = !exercise.rootsEverUnlocked;
  const basisLocked = !exercise.basisEverUnlocked;
  const initialConditionsLocked = !exercise.initialConditionsEverUnlocked;
  const stabilityLocked = !exercise.stabilityEverUnlocked;
  const stabilityStepNumber = activeIncludeInitialConditions ? 5 : 4;

  const clearInitialConditionsFeedback = () => {
    setInitialConditionsResult(null);
  };

  const clearStabilityFeedback = () => {
    setStabilityResult(null);
  };

  const invalidateFromPolynomialEdit = () => {
    setExercise((current) => ({
      ...current,
      polynomialStatus: "unanswered",
      rootsStatus: current.rootsEverUnlocked ? "unanswered" : "locked",
      basisStatus: current.basisEverUnlocked ? "unanswered" : "locked",
      initialConditionsStatus: current.initialConditionsEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      completed: false,
      completionKind: "none",
    }));
    setPolyResult(null);
    setRootResult(null);
    setBasisParseErrors([]);
    setBasisResult(null);
    clearInitialConditionsFeedback();
    clearStabilityFeedback();
  };

  const invalidateFromRootsEdit = () => {
    setExercise((current) => ({
      ...current,
      rootsStatus: "unanswered",
      basisStatus: current.basisEverUnlocked ? "unanswered" : "locked",
      initialConditionsStatus: current.initialConditionsEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      completed: false,
      completionKind: "none",
    }));
    setRootResult(null);
    setBasisParseErrors([]);
    setBasisResult(null);
    clearInitialConditionsFeedback();
    clearStabilityFeedback();
  };

  const invalidateFromBasisEdit = () => {
    setExercise((current) => ({
      ...current,
      basisStatus: "unanswered",
      initialConditionsStatus: current.initialConditionsEverUnlocked ? "unanswered" : "locked",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      completed: false,
      completionKind: "none",
    }));
    setBasisParseErrors([]);
    setBasisResult(null);
    clearInitialConditionsFeedback();
    clearStabilityFeedback();
  };

  const invalidateFromInitialConditionsEdit = () => {
    setExercise((current) => ({
      ...current,
      initialConditionsStatus: "unanswered",
      stabilityStatus: current.stabilityEverUnlocked ? "unanswered" : "locked",
      completed: false,
      completionKind: "none",
    }));
    clearInitialConditionsFeedback();
    clearStabilityFeedback();
  };

  const invalidateFromStabilityEdit = () => {
    setExercise((current) => ({
      ...current,
      stabilityStatus: "unanswered",
      completed: false,
      completionKind: "none",
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
      stabilityStatus: activeIncludeStability
        ? assisted
          ? "revealed"
          : "correct"
        : current.stabilityStatus,
      initialConditionsStatus:
        !activeIncludeStability && activeIncludeInitialConditions
          ? assisted
            ? "revealed"
            : "correct"
          : current.initialConditionsStatus,
      basisStatus:
        !activeIncludeStability && !activeIncludeInitialConditions
          ? assisted
            ? "revealed"
            : "correct"
          : current.basisStatus,
    }));
    setStats((statsCurrent) =>
      assisted ? recordAssistedCompletion(statsCurrent) : recordIndependentCompletion(statsCurrent),
    );
  };

  const unlockInitialConditionsStage = () => {
    if (!activeIncludeInitialConditions) {
      return;
    }
    setExercise((current) => ({
      ...current,
      initialConditionsStatus: current.initialConditionsEverUnlocked ? current.initialConditionsStatus : "unanswered",
      initialConditionsEverUnlocked: true,
    }));
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
    setRootRows(reset.rootRows);
    setBasisEntries(reset.basisEntries);
    setInitialCoeffs(reset.initialCoeffs);
    setStabilityAnswer(reset.stabilityAnswer);
    setExercise(reset.exercise);
    setPolyResult(reset.polyResult);
    setRootResult(reset.rootResult);
    setBasisParseErrors(reset.basisParseErrors);
    setBasisResult(reset.basisResult);
    setInitialConditionsResult(reset.initialConditionsResult);
    setStabilityResult(reset.stabilityResult);
  };

  const beginQuestion = ({
    seedStep,
    nextDegree = degree,
    nextDifficulty = difficulty,
    nextIncludeStability = includeStability,
    nextIncludeInitialConditions = includeInitialConditions,
    abandonIncomplete = false,
  }: {
    seedStep: number;
    nextDegree?: number;
    nextDifficulty?: Difficulty;
    nextIncludeStability?: boolean;
    nextIncludeInitialConditions?: boolean;
    abandonIncomplete?: boolean;
  }) => {
    if (abandonIncomplete && !exercise.completed) {
      setStats((current) => recordAbandonedQuestion(current));
    }
    const resolvedIncludeInitialConditions = resolveIncludeInitialConditions(
      nextDegree,
      nextIncludeInitialConditions,
    );
    setDegree(nextDegree);
    setDifficulty(nextDifficulty);
    setIncludeStability(nextIncludeStability);
    setActiveIncludeStability(nextIncludeStability);
    setIncludeInitialConditions(resolvedIncludeInitialConditions);
    setActiveIncludeInitialConditions(resolvedIncludeInitialConditions);
    setSeed((current) => current + seedStep);
    clearAnswerOnly(nextDegree);
    setStats((current) => recordQuestionStarted(current));
  };

  const checkPolynomial = () => {
    if (exercise.completed) {
      return;
    }
    const result = evaluatePolynomialAnswer(polyCoeffs, question.polynomialCoefficients);
    setPolyResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({
        ...current,
        polynomialStatus: "correct",
        rootsStatus: current.rootsEverUnlocked ? current.rootsStatus : "unanswered",
        rootsEverUnlocked: true,
      }));
    } else {
      setExercise((current) => ({
        ...current,
        polynomialStatus: "incorrect",
      }));
    }
  };

  const revealPolynomial = () => {
    setPolyCoeffs(polynomialDraftFromCoefficients(question.polynomialCoefficients));
    setPolyResult({
      isCorrect: true,
      emptyIndexes: [],
      invalidIndexes: [],
      incorrectIndexes: [],
      errors: [],
      coefficients: question.polynomialCoefficients,
    });
    setExercise((current) => ({
      ...current,
      polynomialStatus: "revealed",
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
        basisStatus: current.basisEverUnlocked ? current.basisStatus : "unanswered",
        basisEverUnlocked: true,
      }));
    } else {
      setExercise((current) => ({
        ...current,
        rootsStatus: "incorrect",
      }));
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
      basisStatus: current.basisEverUnlocked ? current.basisStatus : "unanswered",
      basisEverUnlocked: true,
      usedReveal: true,
    }));
  };

  const checkBasis = () => {
    if (exercise.completed || basisLocked) {
      return;
    }

    const tokens = tokensFromBasisEntries(basisEntries);
    if (tokens.length !== degree) {
      setBasisParseErrors([`יש להזין ${degree} איברי בסיס.`]);
      setBasisResult(null);
      setExercise((current) => ({ ...current, basisStatus: "incorrect" }));
      return;
    }

    const result = compareBasisTokens(question.expectedBasis, tokens, "constant-coefficients");
    setBasisParseErrors([]);
    setBasisResult(result);

    if (result.isCorrect) {
      setExercise((current) => ({ ...current, basisStatus: "correct" }));
      if (activeIncludeInitialConditions) {
        unlockInitialConditionsStage();
      } else if (activeIncludeStability) {
        unlockStabilityStage();
      } else {
        applyCompletion(exercise.usedReveal);
      }
    } else {
      setExercise((current) => ({ ...current, basisStatus: "incorrect" }));
    }
  };

  const revealBasis = () => {
    setBasisEntries(basisEntriesFromTokens(question.expectedBasis));
    setBasisParseErrors([]);
    setBasisResult({
      isCorrect: true,
      missing: [],
      extra: [],
      errors: [],
    });
    setExercise((current) => ({
      ...current,
      basisStatus: "revealed",
      usedReveal: true,
    }));
    if (activeIncludeInitialConditions) {
      unlockInitialConditionsStage();
    } else if (activeIncludeStability) {
      unlockStabilityStage();
    } else {
      applyCompletion(true);
    }
  };

  const checkInitialConditions = () => {
    if (
      exercise.completed ||
      initialConditionsLocked ||
      !activeIncludeInitialConditions ||
      !question.initialConditions
    ) {
      return;
    }

    const result = evaluateInitialCoefficientAnswer(
      initialCoeffs,
      question.initialConditions.expectedCoefficients,
    );
    setInitialConditionsResult(result);
    if (result.isCorrect) {
      setExercise((current) => ({ ...current, initialConditionsStatus: "correct" }));
      if (activeIncludeStability) {
        unlockStabilityStage();
      } else {
        applyCompletion(exercise.usedReveal);
      }
    } else {
      setExercise((current) => ({ ...current, initialConditionsStatus: "incorrect" }));
    }
  };

  const revealInitialConditions = () => {
    if (!question.initialConditions) {
      return;
    }

    setInitialCoeffs(
      initialCoefficientDraftFromValues(question.initialConditions.expectedCoefficients),
    );
    setInitialConditionsResult(
      evaluateInitialCoefficientAnswer(
        initialCoefficientDraftFromValues(question.initialConditions.expectedCoefficients),
        question.initialConditions.expectedCoefficients,
      ),
    );
    setExercise((current) => ({
      ...current,
      initialConditionsStatus: "revealed",
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
  const initialCoefficientFieldStatuses = initialCoeffs.map((_, index) =>
    initialCoefficientFieldStatus(index, initialConditionsResult),
  );
  const initialConditionsAvailable = degree <= MAX_INITIAL_CONDITION_DEGREE;

  return (
    <section className="practice-grid equation-practice-grid full-practice-grid" aria-label="תרגול פתרון מלא">
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
                  onClick={() =>
                    beginQuestion({
                      seedStep: option * 3,
                      nextDegree: option,
                      nextIncludeInitialConditions: resolveIncludeInitialConditions(option, includeInitialConditions),
                      abandonIncomplete: true,
                    })
                  }
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
                    seedStep: option === "easy" ? 101 : option === "medium" ? 211 : 307,
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
              checked={includeInitialConditions}
              disabled={!initialConditionsAvailable}
              onChange={(event) =>
                beginQuestion({
                  seedStep: event.target.checked ? 501 : 509,
                  nextIncludeInitialConditions: event.target.checked,
                  abandonIncomplete: true,
                })
              }
            />
            <span>כלול תנאי התחלה</span>
          </label>
          {!initialConditionsAvailable ? (
            <p className="activity-hint">סעיף תנאי ההתחלה זמין כעת למשוואות מסדר 2–4.</p>
          ) : null}
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
            <span>כלול סעיף יציבות</span>
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
        <div className="practice-question-card">
          <p className="course-kicker">
            Seed {seed} · {difficultyLabels[difficulty]} · מקדמים קבועים · מעלה {degree}
          </p>
          <h2>פתרון מלא של משוואה במקדמים קבועים</h2>
          <p>
            פתרו את המשוואה ב{describePracticeFlow(activeIncludeInitialConditions, activeIncludeStability)}.
          </p>
          <p className="intro-equation">
            <MathText math={question.equationLatex} />
          </p>
        </div>

        {exercise.completed ? (
          <section
            className={`result-card primary full-practice-completion ${exercise.completionKind === "assisted" ? "assisted" : "independent"}`}
          >
            <strong>
              {exercise.completionKind === "independent"
                ? "כל הכבוד — השלמת נכון את כל שלבי הפתרון."
                : "התרגיל הושלם בעזרת הצגת תשובה."}
            </strong>
            <div className="full-practice-summary">
              <p className="intro-equation">
                <MathText math={`p(r)=${question.polynomialLatex}`} />
              </p>
              <ul>
                {question.roots.map((group, index) => (
                  <li key={`summary-root-${index}`}>
                    <MathText math={formatRootGroupHint(group)} />
                  </li>
                ))}
              </ul>
              <div className="solution-basis-list">
                {question.expectedBasisLatex.map((solution, index) => (
                  <p className="intro-equation" key={`summary-basis-${index}`}>
                    <MathText math={`y_{${index + 1}}(x)=${solution}`} />
                  </p>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="full-practice-steps">
          <StepCard
            stepNumber={1}
            title="הפולינום האופייני"
            status={exercise.polynomialStatus}
            locked={false}
          >
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
                היעזרו בהצבה <MathText math="y(x)=e^{rx}" />.
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
            title="שורשים וריבויים"
            status={exercise.rootsStatus}
            locked={rootsLocked}
          >
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
            stepNumber={3}
            title="בסיס למרחב הפתרונות"
            status={exercise.basisStatus}
            locked={basisLocked}
          >
            <p className="activity-hint">
              הזינו בסיס ממשי סטנדרטי המתקבל מן השורשים שמצאתם. אין להזין קומבינציות ליניאריות שרירותיות.
            </p>
            <ConstantBasisComposer
              entries={basisEntries}
              independentVariable="x"
              expectedCount={degree}
              disabled={exercise.completed}
              onChange={(entries) => {
                setBasisEntries(entries);
                invalidateFromBasisEdit();
              }}
            />
            <details className="intro-expansion">
              <summary>רמז</summary>
              <p>שורש ממשי חוזר <MathText math="r" /> מריבוי <MathText math="m" /> מוסיף{" "}
                <MathText math="e^{rx}, xe^{rx}, \ldots, x^{m-1}e^{rx}" />.</p>
              <p>זוג מרוכב <MathText math="\alpha\pm i\beta" /> מריבוי <MathText math="m" /> מוסיף{" "}
                <MathText math="x^ke^{\alpha x}\cos(\beta x)" /> ו-<MathText math="x^ke^{\alpha x}\sin(\beta x)" /> לכל{" "}
                <MathText math="k=0,\ldots,m-1" />.</p>
            </details>
            {basisParseErrors.length > 0 ? (
              <ul className="basis-feedback-list">
                {basisParseErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {basisResult && !basisResult.isCorrect ? (
              <ul className="basis-feedback-list">
                {basisResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {basisResult?.isCorrect ? <p className="stage-success">הבסיס נכון.</p> : null}
            <div className="practice-actions">
              <button type="button" className="panel-action" disabled={exercise.completed || basisLocked} onClick={checkBasis}>
                בדיקת בסיס
              </button>
              <button type="button" className="panel-action secondary" disabled={exercise.completed || basisLocked} onClick={revealBasis}>
                הצג תשובה לשלב
              </button>
            </div>
          </StepCard>

          {activeIncludeInitialConditions && question.initialConditions ? (
            <StepCard
              stepNumber={4}
              title="תנאי התחלה"
              status={exercise.initialConditionsStatus}
              locked={initialConditionsLocked}
            >
              <InitialConditionsStage
                data={question.initialConditions}
                coefficients={initialCoeffs}
                fieldStatuses={initialCoefficientFieldStatuses}
                evaluationResult={initialConditionsResult}
                disabled={exercise.completed || initialConditionsLocked}
                revealed={exercise.initialConditionsStatus === "revealed"}
                onChange={(index, value) => {
                  setInitialCoeffs((current) => current.map((item, idx) => (idx === index ? value : item)));
                  invalidateFromInitialConditionsEdit();
                }}
                onCheck={checkInitialConditions}
                onReveal={revealInitialConditions}
              />
            </StepCard>
          ) : null}

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
                equationKind="constant-coefficients"
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
