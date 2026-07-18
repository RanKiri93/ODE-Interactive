import { formatBasisTokenPreview, normalizeBasisToken } from "../math/basis";
import type { BasisCheckResult, BasisDraftRow, BasisDisplayContext, BasisToken, EquationKind } from "../types";
import { createId } from "../utils/id";
import {
  parseNonNegativeIntegerDraft,
  parseNumericDraft,
} from "../utils/parsing";

export function defaultBasisDraftRows(degree: number): BasisDraftRow[] {
  return Array.from({ length: degree }, () => ({
    id: createId(),
    kind: "real" as const,
    real: "",
    imagAbs: "",
    power: "0",
  }));
}

export function parseBasisDraftRows(rows: BasisDraftRow[]): { tokens: BasisToken[]; errors: string[] } {
  const tokens: BasisToken[] = [];
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const real = parseNumericDraft(row.real);
    const imagAbs = parseNumericDraft(row.imagAbs);
    const power = parseNonNegativeIntegerDraft(row.power);

    if (real === null) {
      errors.push(`בשורה ${index + 1}: החלק הממשי אינו מספר תקין.`);
    }
    if (power === null) {
      errors.push(`בשורה ${index + 1}: החזקה חייבת להיות מספר שלם אי-שלילי.`);
    }

    if (row.kind === "real") {
      if (real !== null && power !== null) {
        tokens.push({ kind: "real", real, power });
      }
      continue;
    }

    if (imagAbs === null || imagAbs <= 0) {
      errors.push(`בשורה ${index + 1}: עבור cos/sin יש להזין חלק מדומה חיובי.`);
      continue;
    }

    if (real !== null && power !== null) {
      tokens.push({
        kind: row.kind === "cos" ? "complex-cos" : "complex-sin",
        real,
        imagAbs,
        power,
      });
    }
  }

  return { tokens, errors };
}

export function compareBasisTokens(
  expected: BasisToken[],
  actual: BasisToken[],
  displayContext: BasisDisplayContext | EquationKind,
): BasisCheckResult {
  const errors: string[] = [];
  const expectedCounts = new Map<string, number>();
  const actualCounts = new Map<string, number>();

  for (const token of expected) {
    const key = normalizeBasisToken(token);
    expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1);
  }

  for (const token of actual) {
    const key = normalizeBasisToken(token);
    actualCounts.set(key, (actualCounts.get(key) ?? 0) + 1);
  }

  const missing: BasisToken[] = [];
  const extra: BasisToken[] = [];

  for (const [key, count] of expectedCounts.entries()) {
    const actualCount = actualCounts.get(key) ?? 0;
    if (actualCount < count) {
      const token = expected.find((item) => normalizeBasisToken(item) === key);
      if (token) {
        for (let step = 0; step < count - actualCount; step += 1) {
          missing.push(token);
        }
      }
    }
  }

  for (const [key, count] of actualCounts.entries()) {
    const expectedCount = expectedCounts.get(key) ?? 0;
    if (count > expectedCount) {
      const token = actual.find((item) => normalizeBasisToken(item) === key);
      if (token) {
        for (let step = 0; step < count - expectedCount; step += 1) {
          extra.push(token);
        }
      }
    }
  }

  if (expected.length !== actual.length) {
    errors.push(`צפויים ${expected.length} איברי בסיס, אך הוזנו ${actual.length}.`);
  }

  for (const token of missing) {
    errors.push(`חסר איבר: ${formatBasisTokenPreview(token, displayContext)}`);
    if (token.kind === "complex-cos" || token.kind === "complex-sin") {
      const partnerKind = token.kind === "complex-cos" ? "complex-sin" : "complex-cos";
      const partner: BasisToken = {
        kind: partnerKind,
        real: token.real,
        imagAbs: token.imagAbs,
        power: token.power,
      };
      if (missing.some((item) => normalizeBasisToken(item) === normalizeBasisToken(partner))) {
        errors.push("עבור שורש מרוכב יש להוסיף גם cos וגם sin.");
      }
    }
  }

  for (const token of extra) {
    errors.push(`איבר מיותר: ${formatBasisTokenPreview(token, displayContext)}`);
  }

  return {
    isCorrect: missing.length === 0 && extra.length === 0,
    missing,
    extra,
    errors: [...new Set(errors)],
  };
}
