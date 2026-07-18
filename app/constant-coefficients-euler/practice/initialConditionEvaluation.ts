import { formatBasisTokenPreview } from "../math/basis";
import { EPS } from "../constants";
import type { BasisToken, InitialCoefficientEvaluationResult } from "../types";
import { formatNumber, formatSignedNumber, numbersEqual } from "../utils/formatting";
import { parseNumericDraft } from "../utils/parsing";

export function defaultInitialCoefficientDraft(count: number): string[] {
  return Array.from({ length: count }, () => "");
}

export function initialCoefficientDraftFromValues(values: number[]): string[] {
  return values.map((value) => String(value));
}

export function evaluateInitialCoefficientAnswer(
  rawInput: string[],
  expected: number[],
): InitialCoefficientEvaluationResult {
  const emptyIndexes: number[] = [];
  const invalidIndexes: number[] = [];
  const incorrectIndexes: number[] = [];
  const parsedValues: Array<number | null> = Array.from({ length: expected.length }, () => null);

  if (rawInput.length !== expected.length) {
    return {
      isCorrect: false,
      emptyIndexes,
      invalidIndexes,
      incorrectIndexes,
      parsedValues,
      message: `צפויים ${expected.length} מקדמים, אך הוזנו ${rawInput.length}.`,
    };
  }

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

    parsedValues[index] = parsed;
    if (!numbersEqual(parsed, expected[index] ?? 0)) {
      incorrectIndexes.push(index);
    }
  }

  if (emptyIndexes.length > 0) {
    return {
      isCorrect: false,
      emptyIndexes,
      invalidIndexes,
      incorrectIndexes,
      parsedValues,
      message: "יש להזין את כל המקדמים.",
    };
  }

  if (invalidIndexes.length > 0) {
    return {
      isCorrect: false,
      emptyIndexes,
      invalidIndexes,
      incorrectIndexes,
      parsedValues,
      message: "אחד או יותר מן הערכים שהוזנו אינם מספרים תקינים.",
    };
  }

  if (incorrectIndexes.length > 0) {
    return {
      isCorrect: false,
      emptyIndexes,
      invalidIndexes,
      incorrectIndexes,
      parsedValues,
      message: "חלק מן המקדמים אינם נכונים.",
    };
  }

  return {
    isCorrect: true,
    emptyIndexes,
    invalidIndexes,
    incorrectIndexes,
    parsedValues,
    message: "המקדמים נכונים, וזהו הפתרון היחיד המקיים את תנאי ההתחלה.",
  };
}

export function initialCoefficientFieldStatus(
  index: number,
  result: InitialCoefficientEvaluationResult | null,
): "neutral" | "empty" | "invalid" | "correct" | "incorrect" {
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

function formatScaledBasisTerm(coefficient: number, basisLatex: string, isFirst: boolean): string {
  if (Math.abs(coefficient) < EPS) {
    return "";
  }

  if (Math.abs(coefficient - 1) < EPS) {
    return isFirst ? basisLatex : `+${basisLatex}`;
  }

  if (Math.abs(coefficient + 1) < EPS) {
    return `-${basisLatex}`;
  }

  const signed = formatSignedNumber(coefficient, isFirst);
  return `${signed}${basisLatex}`;
}

export function formatOrderedBasisBraceLatex(orderedBasis: readonly BasisToken[]): string {
  const parts = orderedBasis.map((token) => formatBasisTokenPreview(token, "constant-x"));
  return `\\left\\{${parts.join(",\\ ")}\\right\\}`;
}

export function formatCombinedSolutionLatex(
  orderedBasis: readonly BasisToken[],
  coefficients: readonly number[],
): string {
  const terms: string[] = [];
  let isFirst = true;

  for (const [index, token] of orderedBasis.entries()) {
    const coefficient = coefficients[index] ?? 0;
    const basisLatex = formatBasisTokenPreview(token, "constant-x");
    const term = formatScaledBasisTerm(coefficient, basisLatex, isFirst);
    if (!term) {
      continue;
    }
    isFirst = false;
    terms.push(term);
  }

  if (terms.length === 0) {
    return "0";
  }

  return terms.join("").replace(/\+-/g, "-");
}

export function formatGeneralSolutionLatex(orderedBasis: readonly BasisToken[]): string {
  const terms = orderedBasis.map((token, index) => {
    const basisLatex = formatBasisTokenPreview(token, "constant-x");
    return `c_{${index + 1}}${basisLatex}`;
  });

  return terms.join("+").replace(/\+-/g, "-");
}

export function formatInitialValueLatex(order: number, value: number): string {
  if (order === 0) {
    return `y(0)=${formatNumber(value)}`;
  }
  if (order === 1) {
    return `y'(0)=${formatNumber(value)}`;
  }
  if (order === 2) {
    return `y''(0)=${formatNumber(value)}`;
  }
  if (order === 3) {
    return `y'''(0)=${formatNumber(value)}`;
  }
  return `y^{(${order})}(0)=${formatNumber(value)}`;
}
