import { EPS } from "../constants";
import { formatBasisTokenPreview } from "./basis";
import type { BasisToken, GivenSolutionExpression } from "../types";
import { formatNumber, normalizeNumber } from "../utils/formatting";

function isZero(value: number): boolean {
  return Math.abs(value) < EPS;
}

export function flattenGivenSolutionExpressions(
  expressions: readonly GivenSolutionExpression[],
): BasisToken[] {
  const tokens: BasisToken[] = [];

  for (const expression of expressions) {
    if (expression.kind === "basis-token") {
      tokens.push(expression.token);
      continue;
    }

    for (const term of expression.terms) {
      if (!isZero(term.coefficient)) {
        tokens.push(term.token);
      }
    }
  }

  return tokens;
}

function formatCombinationCoefficient(coefficient: number, isFirst: boolean): string {
  const normalized = normalizeNumber(coefficient);
  const absolute = formatNumber(Math.abs(normalized));

  if (Math.abs(Math.abs(normalized) - 1) < EPS) {
    if (isFirst) {
      return normalized < 0 ? "-" : "";
    }
    return normalized < 0 ? "-" : "+";
  }

  if (isFirst) {
    return normalized < 0 ? `-${absolute}` : absolute;
  }

  return normalized < 0 ? `-${absolute}` : `+${absolute}`;
}

function formatTermBody(token: BasisToken): string {
  return formatBasisTokenPreview(token, "constant-coefficients");
}

function formatLinearCombinationTerms(
  terms: Array<{ coefficient: number; token: BasisToken }>,
): string {
  const nonzeroTerms = terms.filter((term) => !isZero(term.coefficient));
  if (nonzeroTerms.length === 0) {
    throw new Error("Linear combination must contain at least one nonzero term.");
  }

  const parts: string[] = [];
  let isFirst = true;

  for (const term of nonzeroTerms) {
    const coefficientPrefix = formatCombinationCoefficient(term.coefficient, isFirst);
    const body = formatTermBody(term.token);
    parts.push(`${coefficientPrefix}${body}`);
    isFirst = false;
  }

  return parts.join("").replace(/\+-/g, "-");
}

function formatScaledExponentialCombination(
  terms: Array<{ coefficient: number; token: BasisToken }>,
): string {
  const nonzeroTerms = terms.filter((term) => !isZero(term.coefficient));
  if (nonzeroTerms.length === 0) {
    throw new Error("Linear combination must contain at least one nonzero term.");
  }

  const firstReal =
    nonzeroTerms[0]?.token.kind === "real" ? nonzeroTerms[0].token.real : null;
  const sharedExponential =
    firstReal !== null &&
    nonzeroTerms.every(
      (term) =>
        term.token.kind === "real" &&
        term.token.power === 0 &&
        Math.abs(term.token.real - (firstReal ?? 0)) < EPS,
    );

  if (sharedExponential && firstReal !== null) {
    const innerTerms = nonzeroTerms.map((term, index) => {
      const coeff = term.coefficient;
      const isFirst = index === 0;
      if (Math.abs(coeff - 1) < EPS) {
        return isFirst ? "1" : "+1";
      }
      if (Math.abs(coeff + 1) < EPS) {
        return "-1";
      }
      return formatCombinationCoefficient(coeff, isFirst);
    });
    const exponential = formatTermBody({
      kind: "real",
      real: firstReal,
      power: 0,
    });
    const inner = innerTerms.join("").replace(/^\+/, "").replace(/\+-/g, "-");
    if (inner === "1") {
      return exponential;
    }
    return `${exponential}\\left(${inner}\\right)`;
  }

  const trigTerms = nonzeroTerms.filter(
    (term) => term.token.kind === "complex-cos" || term.token.kind === "complex-sin",
  );
  if (trigTerms.length === nonzeroTerms.length && trigTerms.length >= 2) {
    const reference = trigTerms[0]?.token;
    const sharedTrigPair =
      reference &&
      trigTerms.every(
        (term) =>
          (term.token.kind === "complex-cos" || term.token.kind === "complex-sin") &&
          reference.kind !== "real" &&
          Math.abs(term.token.real - reference.real) < EPS &&
          Math.abs(term.token.imagAbs - reference.imagAbs) < EPS &&
          term.token.power === reference.power,
      );

    if (sharedTrigPair && reference && reference.kind !== "real") {
      const innerParts: string[] = [];
      let isFirst = true;
      for (const term of trigTerms) {
        if (term.token.kind === "real") {
          continue;
        }
        const trigBody =
          term.token.kind === "complex-cos"
            ? `\\cos(${formatNumber(term.token.imagAbs)}x)`
            : `\\sin(${formatNumber(term.token.imagAbs)}x)`;
        const coeffPrefix = formatCombinationCoefficient(term.coefficient, isFirst);
        innerParts.push(`${coeffPrefix}${trigBody}`);
        isFirst = false;
      }
      const exponential =
        Math.abs(reference.real) < EPS
          ? ""
          : formatTermBody({ kind: "real", real: reference.real, power: 0 });
      const inner = innerParts.join("").replace(/^\+/, "").replace(/\+-/g, "-");
      return `${exponential}\\left(${inner}\\right)`;
    }
  }

  return formatLinearCombinationTerms(nonzeroTerms);
}

export function formatGivenSolutionExpressionLatex(expression: GivenSolutionExpression): string {
  if (expression.kind === "basis-token") {
    return formatTermBody(expression.token);
  }

  return formatScaledExponentialCombination(expression.terms);
}

export function formatGivenSolutionExpressionsLatex(
  expressions: readonly GivenSolutionExpression[],
): string[] {
  return expressions.map((expression) => formatGivenSolutionExpressionLatex(expression));
}

export function validateGivenSolutionExpressions(
  expressions: readonly GivenSolutionExpression[],
): boolean {
  if (expressions.length === 0) {
    return false;
  }

  for (const expression of expressions) {
    if (expression.kind === "basis-token") {
      continue;
    }

    const hasNonzero = expression.terms.some((term) => !isZero(term.coefficient));
    if (!hasNonzero) {
      return false;
    }
  }

  return true;
}
