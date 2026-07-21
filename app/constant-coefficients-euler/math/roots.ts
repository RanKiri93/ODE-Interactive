import { EPS } from "../constants";
import type { ParsedRoot, RootRowDraft, SolutionRootGroup } from "../types";
import { createId } from "../utils/id";
import { formatNumber } from "../utils/formatting";
import {
  parseNumericDraft,
  parsePositiveIntegerDraft,
} from "../utils/parsing";
import { expandPolynomialFromGroups } from "./polynomial";

export function defaultRowsForDegree(degree: number): RootRowDraft[] {
  return Array.from({ length: degree }, (_, index) => ({
    id: createId(),
    real: String(index + 1),
    imag: "0",
    multiplicity: "1",
  }));
}

export function parseRootRows(rows: RootRowDraft[]): ParsedRoot[] | null {
  const parsedRows: ParsedRoot[] = [];

  for (const row of rows) {
    const real = parseNumericDraft(row.real);
    const imag = parseNumericDraft(row.imag);
    const multiplicity = parsePositiveIntegerDraft(row.multiplicity);
    if (real === null || imag === null || multiplicity === null) {
      return null;
    }
    parsedRows.push({ real, imag, multiplicity });
  }

  return parsedRows;
}

export function collectSolutionRootGroups(rows: RootRowDraft[]): SolutionRootGroup[] | null {
  const parsedRows = parseRootRows(rows);
  if (!parsedRows) {
    return null;
  }

  const groups: SolutionRootGroup[] = [];
  const complexGroups = new Map<string, { real: number; imagAbs: number; multiplicity: number }>();

  for (const row of parsedRows) {
    if (Math.abs(row.imag) < EPS) {
      groups.push({ kind: "real", real: row.real, multiplicity: row.multiplicity });
      continue;
    }

    const key = `${formatNumber(row.real)}|${formatNumber(Math.abs(row.imag))}`;
    const group = complexGroups.get(key) ?? { real: row.real, imagAbs: Math.abs(row.imag), multiplicity: 0 };
    group.multiplicity += row.multiplicity;
    complexGroups.set(key, group);
  }

  for (const group of complexGroups.values()) {
    groups.push({ kind: "complex", real: group.real, imagAbs: group.imagAbs, multiplicity: group.multiplicity });
  }

  return groups;
}

export function validateRootRows(rows: RootRowDraft[], degree: number): string[] {
  const errors: string[] = [];

  if (rows.length === 0) {
    errors.push("יש להזין לפחות שורש אחד.");
    return errors;
  }

  const parsedRows: ParsedRoot[] = [];
  for (const [index, row] of rows.entries()) {
    const real = parseNumericDraft(row.real);
    const imag = parseNumericDraft(row.imag);
    const multiplicity = parsePositiveIntegerDraft(row.multiplicity);

    if (real === null) {
      errors.push(`בשורה ${index + 1}: החלק הממשי אינו מספר תקין.`);
    }
    if (imag === null) {
      errors.push(`בשורה ${index + 1}: החלק המדומה אינו מספר תקין.`);
    }
    if (multiplicity === null) {
      errors.push(`בשורה ${index + 1}: הריבוי חייב להיות מספר שלם חיובי.`);
    }

    if (real !== null && imag !== null && multiplicity !== null) {
      parsedRows.push({ real, imag, multiplicity });
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  const totalMultiplicity = parsedRows.reduce((sum, row) => sum + row.multiplicity, 0);
  if (totalMultiplicity !== degree) {
    errors.push(`סכום הריבויים (${totalMultiplicity}) חייב להיות שווה למעלה (${degree}).`);
  }

  const complexGroups = new Map<string, { positive: number; negative: number }>();

  for (const row of parsedRows) {
    if (Math.abs(row.imag) < EPS) {
      continue;
    }

    const key = `${formatNumber(row.real)}|${formatNumber(Math.abs(row.imag))}`;
    const group = complexGroups.get(key) ?? { positive: 0, negative: 0 };

    if (row.imag > 0) {
      group.positive += row.multiplicity;
    } else {
      group.negative += row.multiplicity;
    }

    complexGroups.set(key, group);
  }

  for (const [key, group] of complexGroups.entries()) {
    if (group.positive === 0 || group.negative === 0) {
      errors.push(`לשורש המרוכב ${key.replace("|", "+/-")}i חסר הצמוד המתאים.`);
      continue;
    }
    if (group.positive !== group.negative) {
      errors.push(`לשורש המרוכב ${key.replace("|", "+/-")}i הריבוי של הצמודים חייב להיות זהה.`);
    }
  }

  return errors;
}

export function expandPolynomialFromRows(rows: RootRowDraft[]): number[] | null {
  const groups = collectSolutionRootGroups(rows);
  if (!groups) {
    return null;
  }

  return expandPolynomialFromGroups(groups);
}
