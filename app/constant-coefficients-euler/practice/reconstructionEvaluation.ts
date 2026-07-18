import { EPS } from "../constants";
import { formatAffineEquationLatexFromCoefficients } from "../math/algebraicFormatting";
import type {
  LambdaConstraint,
  ReconstructionFeasibilityAnalysis,
  ReconstructionFeasibilityAnswer,
  ReconstructionImpossibleReason,
  ReconstructionOutcome,
} from "../types";

function derivativeLabel(order: number, dependent: "y"): string {
  if (order === 0) {
    return dependent;
  }
  if (order === 1) {
    return `${dependent}'`;
  }
  if (order === 2) {
    return `${dependent}''`;
  }
  return `${dependent}^{(${order})}`;
}

export function formatAffineConstantCoefficientEquation(
  coefficients: Array<{ constant: number; lambda: number }>,
): string {
  return formatAffineEquationLatexFromCoefficients(coefficients, (order) =>
    derivativeLabel(order, "y"),
  );
}

export function formatAffineEulerEquation(
  coefficients: Array<{ constant: number; lambda: number }>,
): string {
  return formatAffineEquationLatexFromCoefficients(coefficients, (order) => {
    if (order === 0) {
      return "y";
    }
    const powerSuffix = order === 1 ? "" : `^{${order}}`;
    return `x${powerSuffix}${derivativeLabel(order, "y")}`;
  });
}

export function evaluateFeasibilityAnswer(
  selected: ReconstructionFeasibilityAnswer | null,
  expected: ReconstructionFeasibilityAnswer,
): { isCorrect: boolean; message: string } {
  if (!selected) {
    return { isCorrect: false, message: "יש לבחור האם הנתונים יכולים להתקיים יחד." };
  }
  if (selected === expected) {
    return {
      isCorrect: true,
      message:
        expected === "feasible"
          ? "הנתונים יכולים להתקיים יחד."
          : "נכון — אין משוואה המתאימה לכל הנתונים.",
    };
  }
  return {
    isCorrect: false,
    message:
      expected === "feasible"
        ? "הנתונים אכן יכולים להתקיים יחד."
        : "למעשה, הנתונים אינם יכולים להתקיים יחד.",
  };
}

export function expectedFeasibilityFromAnalysis(
  analysis: ReconstructionFeasibilityAnalysis,
): ReconstructionFeasibilityAnswer {
  return analysis.feasible ? "feasible" : "infeasible";
}

export function evaluateOutcomeAnswer(
  selected: ReconstructionOutcome | null,
  expected: ReconstructionOutcome,
): { isCorrect: boolean; message: string } {
  if (!selected) {
    return { isCorrect: false, message: "יש לבחור את יחידות המשוואה." };
  }
  if (selected === expected) {
    if (expected === "unique") {
      return { isCorrect: true, message: "נכון. מתקבלת משוואה מנורמלת יחידה." };
    }
    if (expected === "one-real-parameter") {
      return {
        isCorrect: true,
        message: "נכון. מתקבלת משפחה חד־פרמטרית של משוואות מנורמלות.",
      };
    }
    return { isCorrect: true, message: "סיווג יחידות המשוואה נכון." };
  }
  return { isCorrect: false, message: "סיווג יחידות המשוואה אינו מתאים לנתונים." };
}

export function evaluateLambdaConstraintAnswer(
  selected: LambdaConstraint | null,
  expected: LambdaConstraint,
): { isCorrect: boolean; message: string } {
  if (!selected) {
    return { isCorrect: false, message: "יש לבחור את התחום האפשרי של השורש החסר." };
  }
  if (selected === expected) {
    return { isCorrect: true, message: "lambda-constraint-correct" };
  }
  return { isCorrect: false, message: "התנאי שבחרתם אינו מתאים לנתון על התנהגות הפתרונות." };
}

export function evaluateImpossibleReasonAnswer(
  selected: ReconstructionImpossibleReason | null,
  expected: ReconstructionImpossibleReason,
): { isCorrect: boolean; message: string } {
  if (!selected) {
    return { isCorrect: false, message: "יש לבחור את סיבת האי-אפשרות." };
  }
  if (selected === expected) {
    return { isCorrect: true, message: "הסיבה שנבחרה נכונה." };
  }
  return { isCorrect: false, message: "הסיבה שנבחרה אינה מתאימה לנתונים." };
}

export function evaluateUniqueEquationPair(
  polyCorrect: boolean,
  equationCorrect: boolean,
): { isCorrect: boolean; message: string } {
  if (polyCorrect && equationCorrect) {
    return { isCorrect: true, message: "הפולינום האופייני המנורמל והמשוואה המנורמלת נכונים." };
  }
  if (polyCorrect && !equationCorrect) {
    return {
      isCorrect: false,
      message: "הפולינום האופייני המנורמל נכון, אך המשוואה המנורמלת אינה מתאימה.",
    };
  }
  if (!polyCorrect && equationCorrect) {
    return {
      isCorrect: false,
      message: "המשוואה המנורמלת מתאימה לפולינום שהוזן, אך הפולינום האופייני המנורמל אינו נכון.",
    };
  }
  return {
    isCorrect: false,
    message: "הפולינום האופייני המנורמל והמשוואה המנורמלת אינם נכונים.",
  };
}

export function isCoefficientVectorZero(coefficients: number[]): boolean {
  return coefficients.every((value) => Math.abs(value) < EPS);
}
