import { EPS } from "../constants";
import type { PolynomialEvaluationResult, CoefficientFieldStatus } from "../types";
import { numbersEqual } from "../utils/formatting";
import { parseNumericDraft } from "../utils/parsing";

export function defaultPolynomialDraft(degree: number): string[] {
  return Array.from({ length: degree + 1 }, () => "");
}

export function polynomialDraftFromCoefficients(coefficients: number[]): string[] {
  return coefficients.map((coefficient) => String(coefficient));
}

export function evaluatePolynomialAnswer(
  rawInput: string[],
  expected: number[],
): PolynomialEvaluationResult {
  const emptyIndexes: number[] = [];
  const invalidIndexes: number[] = [];
  const incorrectIndexes: number[] = [];
  const errors: string[] = [];

  if (rawInput.length !== expected.length) {
    return {
      isCorrect: false,
      emptyIndexes,
      invalidIndexes,
      incorrectIndexes,
      errors: [`צפויים ${expected.length} מקדמים, אך הוזנו ${rawInput.length}.`],
      coefficients: null,
    };
  }

  const coefficients: number[] = [];

  for (const [index, value] of rawInput.entries()) {
    const trimmed = value.trim();
    if (!trimmed) {
      emptyIndexes.push(index);
      continue;
    }

    const parsed = parseNumericDraft(value);
    if (parsed === null) {
      invalidIndexes.push(index);
      continue;
    }

    coefficients[index] = parsed;
    if (!numbersEqual(parsed, expected[index])) {
      incorrectIndexes.push(index);
    }
  }

  if (emptyIndexes.length > 0) {
    errors.push(`יש למלא את כל המקדמים (${emptyIndexes.length} שדות ריקים).`);
  }

  if (invalidIndexes.length > 0) {
    errors.push(`יש ${invalidIndexes.length} שדות שאינם מספרים תקינים.`);
  }

  if (incorrectIndexes.length > 0 && emptyIndexes.length === 0 && invalidIndexes.length === 0) {
    errors.push(formatIncorrectCoefficientCount(incorrectIndexes.length));
  }

  const isCorrect =
    emptyIndexes.length === 0 &&
    invalidIndexes.length === 0 &&
    incorrectIndexes.length === 0 &&
    coefficients.length === expected.length;

  return {
    isCorrect,
    emptyIndexes,
    invalidIndexes,
    incorrectIndexes,
    errors,
    coefficients: isCorrect ? coefficients : coefficients.length === expected.length ? coefficients : null,
  };
}

export function formatIncorrectCoefficientCount(count: number): string {
  if (count === 1) {
    return "יש מקדם שגוי אחד.";
  }
  return `יש ${count} מקדמים שגויים.`;
}

export function coefficientFieldStatus(
  index: number,
  result: PolynomialEvaluationResult | null,
): CoefficientFieldStatus {
  if (!result) {
    return "neutral";
  }
  if (result.emptyIndexes.includes(index)) {
    return "empty";
  }
  if (result.invalidIndexes.includes(index)) {
    return "invalid";
  }
  if (result.incorrectIndexes.includes(index)) {
    return "incorrect";
  }
  if (!result.emptyIndexes.includes(index) && !result.invalidIndexes.includes(index)) {
    return "correct";
  }
  return "neutral";
}

export function assertPolynomialIsMonic(coefficients: number[], degree: number) {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const leading = coefficients[degree];
  if (leading === undefined || Math.abs(leading - 1) > EPS) {
    throw new Error(`Expected monic polynomial of degree ${degree}, got leading coefficient ${leading}.`);
  }
}
