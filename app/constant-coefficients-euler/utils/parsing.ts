export function parseNumericDraft(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePositiveIntegerDraft(value: string): number | null {
  const parsed = parseNumericDraft(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parseNonNegativeIntegerDraft(value: string): number | null {
  const parsed = parseNumericDraft(value);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}
