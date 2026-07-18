import { normalizeBasisToken } from "../math/basis";
import type { BasisEntry, BasisToken } from "../types";
import { createId } from "../utils/id";
import { normalizeNumber } from "../utils/formatting";
import {
  parseNumericDraft,
  parsePositiveIntegerDraft,
} from "../utils/parsing";

export type ConstantBasisTemplate =
  | "real-exponential"
  | "real-power-exponential"
  | "complex-cos"
  | "complex-sin"
  | "complex-power-cos"
  | "complex-power-sin";

export type BasisElementDraft = {
  template: ConstantBasisTemplate | null;
  real: string;
  imag: string;
  power: string;
};

export function emptyBasisElementDraft(): BasisElementDraft {
  return {
    template: null,
    real: "",
    imag: "",
    power: "",
  };
}

export function defaultBasisEntries(): BasisEntry[] {
  return [];
}

export function basisEntriesFromTokens(tokens: readonly BasisToken[]): BasisEntry[] {
  return tokens.map((token) => ({
    id: createId(),
    token,
  }));
}

export function tokensFromBasisEntries(entries: readonly BasisEntry[]): BasisToken[] {
  return entries.map((entry) => entry.token);
}

export function templateFromToken(token: BasisToken): ConstantBasisTemplate {
  if (token.kind === "real") {
    return token.power === 0 ? "real-exponential" : "real-power-exponential";
  }
  if (token.kind === "complex-cos") {
    return token.power === 0 ? "complex-cos" : "complex-power-cos";
  }
  return token.power === 0 ? "complex-sin" : "complex-power-sin";
}

export function draftFromToken(token: BasisToken): BasisElementDraft {
  const template = templateFromToken(token);
  if (token.kind === "real") {
    return {
      template,
      real: String(token.real),
      imag: "",
      power: token.power === 0 ? "" : String(token.power),
    };
  }
  return {
    template,
    real: String(token.real),
    imag: String(token.imagAbs),
    power: token.power === 0 ? "" : String(token.power),
  };
}

export function tokenFromDraft(draft: BasisElementDraft): BasisToken | null {
  if (!draft.template) {
    return null;
  }

  const real = parseNumericDraft(draft.real);
  if (real === null) {
    return null;
  }

  switch (draft.template) {
    case "real-exponential":
      return { kind: "real", real: normalizeNumber(real), power: 0 };
    case "real-power-exponential": {
      const power = parsePositiveIntegerDraft(draft.power);
      if (power === null) {
        return null;
      }
      return { kind: "real", real: normalizeNumber(real), power };
    }
    case "complex-cos":
    case "complex-sin": {
      const imag = parseNumericDraft(draft.imag);
      if (imag === null || imag <= 0) {
        return null;
      }
      return {
        kind: draft.template === "complex-cos" ? "complex-cos" : "complex-sin",
        real: normalizeNumber(real),
        imagAbs: normalizeNumber(imag),
        power: 0,
      };
    }
    case "complex-power-cos":
    case "complex-power-sin": {
      const imag = parseNumericDraft(draft.imag);
      const power = parsePositiveIntegerDraft(draft.power);
      if (imag === null || imag <= 0 || power === null) {
        return null;
      }
      return {
        kind: draft.template === "complex-power-cos" ? "complex-cos" : "complex-sin",
        real: normalizeNumber(real),
        imagAbs: normalizeNumber(imag),
        power,
      };
    }
    default:
      return null;
  }
}

export function validateBasisElementDraft(draft: BasisElementDraft): string | null {
  if (!draft.template) {
    return "יש לבחור תבנית.";
  }

  const token = tokenFromDraft(draft);
  if (!token) {
    if (draft.template === "real-exponential") {
      return "יש להזין ערך ממשי תקין עבור r.";
    }
    if (draft.template === "real-power-exponential") {
      return "יש להזין k שלם חיובי ו-r ממשי.";
    }
    if (draft.template === "complex-cos" || draft.template === "complex-sin") {
      return "יש להזין α ממשי ו-β חיובי.";
    }
    return "יש להזין k שלם חיובי, α ממשי ו-β חיובי.";
  }

  return null;
}

export function isDuplicateBasisToken(entries: readonly BasisEntry[], token: BasisToken, excludeId?: string): boolean {
  const key = normalizeBasisToken(token);
  return entries.some(
    (entry) => entry.id !== excludeId && normalizeBasisToken(entry.token) === key,
  );
}
