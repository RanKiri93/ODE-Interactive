import { formatRootGroupFeedbackLabel } from "../math/basis";
import {
  canonicalizeRootGroups,
  rootIdentityKey,
} from "../math/rootCanonicalization";
import type { RootComparisonResult, RootGroupDraft, SolutionRootGroup } from "../types";
import { createId } from "../utils/id";
import { formatNumber } from "../utils/formatting";
import {
  parseNumericDraft,
  parsePositiveIntegerDraft,
} from "../utils/parsing";

export function defaultRootGroupDrafts(count = 1): RootGroupDraft[] {
  return Array.from({ length: count }, () => ({
    id: createId(),
    kind: "real" as const,
    real: "",
    imagAbs: "",
    multiplicity: "1",
  }));
}

export function rootGroupDraftsFromGroups(groups: SolutionRootGroup[]): RootGroupDraft[] {
  return canonicalizeRootGroups(groups).map((group) => ({
    id: createId(),
    kind: group.kind === "real" ? "real" : "complex-pair",
    real: formatNumber(group.real),
    imagAbs: group.kind === "complex" ? formatNumber(group.imagAbs) : "",
    multiplicity: String(group.multiplicity),
  }));
}

export function totalRootDegree(groups: SolutionRootGroup[]): number {
  return groups.reduce(
    (sum, group) => sum + (group.kind === "real" ? group.multiplicity : 2 * group.multiplicity),
    0,
  );
}

export function totalDraftDegree(rows: RootGroupDraft[]): number | null {
  const parsed = parseRootGroupDrafts(rows);
  if (!parsed.groups) {
    return null;
  }
  return totalRootDegree(parsed.groups);
}

export function parseRootGroupDrafts(rows: RootGroupDraft[]): {
  groups: SolutionRootGroup[] | null;
  invalidGroups: number[];
  errors: string[];
} {
  const invalidGroups: number[] = [];
  const errors: string[] = [];
  const groups: SolutionRootGroup[] = [];

  for (const [index, row] of rows.entries()) {
    const real = parseNumericDraft(row.real);
    const multiplicity = parsePositiveIntegerDraft(row.multiplicity);

    if (real === null) {
      invalidGroups.push(index);
      errors.push(`בשורה ${index + 1}: החלק הממשי אינו מספר תקין.`);
    }
    if (multiplicity === null) {
      invalidGroups.push(index);
      errors.push(`בשורה ${index + 1}: הריבוי חייב להיות מספר שלם חיובי.`);
    }

    if (row.kind === "real") {
      if (real !== null && multiplicity !== null) {
        groups.push({ kind: "real", real, multiplicity });
      }
      continue;
    }

    const imagAbs = parseNumericDraft(row.imagAbs);
    if (imagAbs === null || imagAbs <= 0) {
      invalidGroups.push(index);
      errors.push(`בשורה ${index + 1}: עבור זוג מרוכב יש להזין חלק מדומה חיובי.`);
      continue;
    }

    if (real !== null && multiplicity !== null) {
      groups.push({ kind: "complex", real, imagAbs, multiplicity });
    }
  }

  if (invalidGroups.length > 0) {
    return { groups: null, invalidGroups: [...new Set(invalidGroups)], errors };
  }

  return { groups, invalidGroups: [], errors: [] };
}

export function compareRootGroups(
  actualRows: RootGroupDraft[],
  expected: SolutionRootGroup[],
  expectedDegree: number,
): RootComparisonResult {
  const parsed = parseRootGroupDrafts(actualRows);
  const errors = [...parsed.errors];

  if (!parsed.groups) {
    return {
      isCorrect: false,
      invalidGroups: parsed.invalidGroups,
      degreeMismatch: false,
      enteredDegree: 0,
      expectedDegree,
      missing: [],
      extra: [],
      multiplicityMismatches: [],
      errors,
      groups: null,
    };
  }

  const normalizedActual = canonicalizeRootGroups(parsed.groups);
  const normalizedExpected = canonicalizeRootGroups(expected);

  const enteredDegree = totalRootDegree(normalizedActual);
  const degreeMismatch = enteredDegree !== expectedDegree;
  if (degreeMismatch) {
    errors.push(`סכום הריבויים (${enteredDegree}) חייב להיות שווה למעלה (${expectedDegree}).`);
  }

  const expectedByIdentity = new Map<string, SolutionRootGroup>();
  for (const group of normalizedExpected) {
    expectedByIdentity.set(rootIdentityKey(group), group);
  }

  const actualByIdentity = new Map<string, SolutionRootGroup>();
  for (const group of normalizedActual) {
    actualByIdentity.set(rootIdentityKey(group), group);
  }

  const missing: SolutionRootGroup[] = [];
  const extra: SolutionRootGroup[] = [];
  const multiplicityMismatches: SolutionRootGroup[] = [];

  for (const [key, expectedGroup] of expectedByIdentity.entries()) {
    const actualGroup = actualByIdentity.get(key);
    if (!actualGroup) {
      missing.push(expectedGroup);
      errors.push(`חסר שורש: ${formatRootGroupFeedbackLabel(expectedGroup)}`);
      continue;
    }
    if (actualGroup.multiplicity !== expectedGroup.multiplicity) {
      multiplicityMismatches.push(expectedGroup);
      errors.push(
        `ריבוי שגוי: נדרש ${formatRootGroupFeedbackLabel(expectedGroup)}, הוזן ${formatRootGroupFeedbackLabel(actualGroup)}.`,
      );
    }
  }

  for (const [key, actualGroup] of actualByIdentity.entries()) {
    if (!expectedByIdentity.has(key)) {
      extra.push(actualGroup);
      errors.push(`שורש מיותר: ${formatRootGroupFeedbackLabel(actualGroup)}`);
    }
  }

  const isCorrect =
    !degreeMismatch &&
    missing.length === 0 &&
    extra.length === 0 &&
    multiplicityMismatches.length === 0 &&
    parsed.invalidGroups.length === 0;

  return {
    isCorrect,
    invalidGroups: parsed.invalidGroups,
    degreeMismatch,
    enteredDegree,
    expectedDegree,
    missing,
    extra,
    multiplicityMismatches,
    errors: [...new Set(errors)],
    groups: normalizedActual,
  };
}

export function assertRootGroupsMatchDegree(groups: SolutionRootGroup[], degree: number) {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const total = totalRootDegree(groups);
  if (total !== degree) {
    throw new Error(`Root groups degree ${total} does not match requested degree ${degree}.`);
  }
}
