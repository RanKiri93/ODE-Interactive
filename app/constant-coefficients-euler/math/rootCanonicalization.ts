import type { SolutionRootGroup } from "../types";
import { formatNumber, normalizeNumber } from "../utils/formatting";

function normalizeRealRoot(real: number): number {
  return normalizeNumber(real);
}

function normalizeImagAbs(imagAbs: number): number {
  return normalizeNumber(Math.abs(imagAbs));
}

export function realRootIdentityKey(real: number): string {
  return `real|${formatNumber(normalizeRealRoot(real))}`;
}

export function complexRootIdentityKey(real: number, imagAbs: number): string {
  return `complex|${formatNumber(normalizeRealRoot(real))}|${formatNumber(normalizeImagAbs(imagAbs))}`;
}

export function rootIdentityKey(group: SolutionRootGroup): string {
  if (group.kind === "real") {
    return realRootIdentityKey(group.real);
  }
  return complexRootIdentityKey(group.real, group.imagAbs);
}

export function mergeRootFactorsBySummingMultiplicity(
  existing: SolutionRootGroup | undefined,
  incoming: SolutionRootGroup,
): SolutionRootGroup {
  if (!existing) {
    if (incoming.kind === "real") {
      return {
        kind: "real",
        real: normalizeRealRoot(incoming.real),
        multiplicity: incoming.multiplicity,
      };
    }
    return {
      kind: "complex",
      real: normalizeRealRoot(incoming.real),
      imagAbs: normalizeImagAbs(incoming.imagAbs),
      multiplicity: incoming.multiplicity,
    };
  }

  return {
    ...existing,
    multiplicity: existing.multiplicity + incoming.multiplicity,
  };
}

export function mergeForcedRootRequirementsByMaximumMultiplicity(
  existing: SolutionRootGroup | undefined,
  incoming: SolutionRootGroup,
): SolutionRootGroup {
  if (!existing) {
    if (incoming.kind === "real") {
      return {
        kind: "real",
        real: normalizeRealRoot(incoming.real),
        multiplicity: incoming.multiplicity,
      };
    }
    return {
      kind: "complex",
      real: normalizeRealRoot(incoming.real),
      imagAbs: normalizeImagAbs(incoming.imagAbs),
      multiplicity: incoming.multiplicity,
    };
  }

  return {
    ...existing,
    multiplicity: Math.max(existing.multiplicity, incoming.multiplicity),
  };
}

function compareCanonicalGroups(a: SolutionRootGroup, b: SolutionRootGroup): number {
  if (a.kind === "real" && b.kind === "real") {
    return a.real - b.real;
  }
  if (a.kind === "real") {
    return -1;
  }
  if (b.kind === "real") {
    return 1;
  }
  const realDiff = a.real - b.real;
  if (realDiff !== 0) {
    return realDiff;
  }
  return a.imagAbs - b.imagAbs;
}

export function rootGroupsDegree(groups: readonly SolutionRootGroup[]): number {
  return groups.reduce(
    (sum, group) => sum + (group.kind === "real" ? group.multiplicity : 2 * group.multiplicity),
    0,
  );
}

export function canonicalizeRootGroups(groups: readonly SolutionRootGroup[]): SolutionRootGroup[] {
  const merged = new Map<string, SolutionRootGroup>();

  for (const group of groups) {
    const key = rootIdentityKey(group);
    merged.set(key, mergeRootFactorsBySummingMultiplicity(merged.get(key), group));
  }

  return Array.from(merged.values()).sort(compareCanonicalGroups);
}

export function assertCanonicalizationPreservesDegree(
  originalGroups: readonly SolutionRootGroup[],
  canonicalGroups: readonly SolutionRootGroup[],
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  const originalDegree = rootGroupsDegree(originalGroups);
  const canonicalDegree = rootGroupsDegree(canonicalGroups);
  if (originalDegree !== canonicalDegree) {
    throw new Error(
      `Canonicalization changed root degree from ${originalDegree} to ${canonicalDegree}.`,
    );
  }
}
