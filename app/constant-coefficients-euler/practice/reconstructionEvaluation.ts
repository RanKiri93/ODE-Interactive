import { formatAffineCoefficientLatex } from "../math/affinePolynomial";
import { EPS } from "../constants";
import type {
  LambdaConstraint,
  ReconstructionFeasibilityAnswer,
  ReconstructionImpossibleReason,
  ReconstructionOutcome,
} from "../types";
import { formatNumber } from "../utils/formatting";

function formatAffineEquationTerm(
  coefficient: { constant: number; lambda: number },
  symbol: string,
  isFirst: boolean,
): string {
  const body = formatAffineCoefficientLatex(coefficient);
  if (body === "0") {
    return "";
  }

  const needsParen = body.includes("+") || body.includes("-") || body.includes("\\lambda");
  const wrapped = needsParen ? `\\left(${body}\\right)` : body;
  const absoluteConstant = Math.abs(coefficient.constant);
  const absoluteLambda = Math.abs(coefficient.lambda);
  const isNegative =
    (Math.abs(absoluteLambda) < EPS && coefficient.constant < 0) ||
    (Math.abs(absoluteConstant) < EPS && coefficient.lambda < 0);

  if (isFirst) {
    return isNegative ? `-${wrapped}${symbol}` : `${wrapped}${symbol}`;
  }

  return isNegative ? `-${wrapped}${symbol}` : `+${wrapped}${symbol}`;
}

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
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = coefficients[order];
    if (!coefficient) {
      continue;
    }
    const term = formatAffineEquationTerm(coefficient, derivativeLabel(order, "y"), isFirst);
    if (!term) {
      continue;
    }
    isFirst = false;
    terms.push(term);
  }

  return `${terms.join("")}=0`;
}

export function formatAffineEulerEquation(
  coefficients: Array<{ constant: number; lambda: number }>,
): string {
  const degree = coefficients.length - 1;
  const terms: string[] = [];
  let isFirst = true;

  for (let order = degree; order >= 0; order -= 1) {
    const coefficient = coefficients[order];
    if (!coefficient) {
      continue;
    }

    let symbol = "y";
    if (order > 0) {
      const powerSuffix = order === 1 ? "" : `^{${order}}`;
      symbol = `x${powerSuffix}${derivativeLabel(order, "y")}`;
    }

    const term = formatAffineEquationTerm(coefficient, symbol, isFirst);
    if (!term) {
      continue;
    }
    isFirst = false;
    terms.push(term);
  }

  return `${terms.join("")}=0`;
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
  kind: ReconstructionOutcome,
): ReconstructionFeasibilityAnswer {
  return kind === "impossible" ? "infeasible" : "feasible";
}

export function evaluateOutcomeAnswer(
  selected: ReconstructionOutcome | null,
  expected: ReconstructionOutcome,
): { isCorrect: boolean; message: string } {
  if (!selected) {
    return { isCorrect: false, message: "יש לבחור את סוג הקביעה." };
  }
  if (selected === expected) {
    return { isCorrect: true, message: "סיווג הקביעה נכון." };
  }
  return { isCorrect: false, message: "סיווג הקביעה אינו מתאים לנתונים." };
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
    return { isCorrect: true, message: "הפולינום והמשוואה נכונים." };
  }
  if (polyCorrect && !equationCorrect) {
    return { isCorrect: false, message: "הפולינום האופייני נכון, אך המשוואה אינה מתאימה." };
  }
  if (!polyCorrect && equationCorrect) {
    return { isCorrect: false, message: "המשוואה מתאימה לפולינום שהוזן, אך הפולינום אינו נכון." };
  }
  return { isCorrect: false, message: "הפולינום והמשוואה אינם נכונים." };
}

export function formatForcedPolynomialFactored(forcedPolynomial: number[]): string {
  const degree = forcedPolynomial.length - 1;
  if (degree <= 0) {
    return formatNumber(forcedPolynomial[0] ?? 1);
  }
  return `q(r)=${forcedPolynomial
    .map((coefficient, index) => `${formatNumber(coefficient)}r^{${index}}`)
    .join("+")
    .replace(/\+-/g, "-")}`;
}

export function isCoefficientVectorZero(coefficients: number[]): boolean {
  return coefficients.every((value) => Math.abs(value) < EPS);
}
