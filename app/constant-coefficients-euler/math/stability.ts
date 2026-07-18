import { EPS } from "../constants";
import type { SolutionRootGroup, StabilityClassification, StabilityReason } from "../types";

export type StabilityAnalysis = {
  classification: StabilityClassification;
  reason: StabilityReason;
  hasPositiveRealPartRoot: boolean;
  hasImaginaryAxisRoot: boolean;
  hasRepeatedImaginaryAxisRoot: boolean;
};

function isZero(value: number): boolean {
  return Math.abs(value) < EPS;
}

function isPositive(value: number): boolean {
  return value > EPS;
}

function isOnImaginaryAxis(realPart: number): boolean {
  return isZero(realPart);
}

export function analyzeStability(roots: readonly SolutionRootGroup[]): StabilityAnalysis {
  let hasPositiveRealPartRoot = false;
  let hasImaginaryAxisRoot = false;
  let hasRepeatedImaginaryAxisRoot = false;

  for (const group of roots) {
    const realPart = group.real;

    if (isPositive(realPart)) {
      hasPositiveRealPartRoot = true;
    }

    if (isOnImaginaryAxis(realPart)) {
      hasImaginaryAxisRoot = true;
      if (group.multiplicity > 1) {
        hasRepeatedImaginaryAxisRoot = true;
      }
    }
  }

  let classification: StabilityClassification;
  if (hasPositiveRealPartRoot || hasRepeatedImaginaryAxisRoot) {
    classification = "unstable";
  } else if (hasImaginaryAxisRoot) {
    classification = "stable-not-asymptotic";
  } else {
    classification = "asymptotically-stable";
  }

  let reason: StabilityReason;
  if (hasPositiveRealPartRoot) {
    reason = "positive-real-part-root";
  } else if (hasRepeatedImaginaryAxisRoot) {
    reason = "repeated-imaginary-axis-root";
  } else if (hasImaginaryAxisRoot) {
    reason = "simple-imaginary-axis-roots";
  } else {
    reason = "all-strictly-negative";
  }

  return {
    classification,
    reason,
    hasPositiveRealPartRoot,
    hasImaginaryAxisRoot,
    hasRepeatedImaginaryAxisRoot,
  };
}
