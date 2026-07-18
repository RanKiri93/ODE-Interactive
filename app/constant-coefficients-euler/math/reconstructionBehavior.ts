import { EPS } from "../constants";
import type {
  BasisToken,
  ReconstructionBehaviorCondition,
  ReconstructionImpossibleReason,
  SolutionRootGroup,
} from "../types";

function isZero(value: number): boolean {
  return Math.abs(value) < EPS;
}

function isNegative(value: number): boolean {
  return value < -EPS;
}

function isPositive(value: number): boolean {
  return value > EPS;
}

function isOnImaginaryAxis(realPart: number): boolean {
  return isZero(realPart);
}

export function isRootSetBoundedAtPlusInfinity(roots: readonly SolutionRootGroup[]): boolean {
  for (const group of roots) {
    if (isPositive(group.real)) {
      return false;
    }
    if (isOnImaginaryAxis(group.real) && group.multiplicity > 1) {
      return false;
    }
    if (group.kind === "real" && isZero(group.real) && group.multiplicity > 1) {
      return false;
    }
  }
  return true;
}

export function isRootSetDecayAtPlusInfinity(roots: readonly SolutionRootGroup[]): boolean {
  return roots.every((group) => isNegative(group.real));
}

export function isRootSetBoundedAtMinusInfinity(roots: readonly SolutionRootGroup[]): boolean {
  for (const group of roots) {
    if (isNegative(group.real)) {
      return false;
    }
    if (isOnImaginaryAxis(group.real) && group.multiplicity > 1) {
      return false;
    }
    if (group.kind === "real" && isZero(group.real) && group.multiplicity > 1) {
      return false;
    }
  }
  return true;
}

export function isRootSetDecayAtMinusInfinity(roots: readonly SolutionRootGroup[]): boolean {
  return roots.every((group) => isPositive(group.real));
}

export function isForcedRootSetCompatibleWithBehavior(
  roots: readonly SolutionRootGroup[],
  condition: ReconstructionBehaviorCondition,
): boolean {
  switch (condition) {
    case "none":
      return true;
    case "bounded-plus-infinity":
      return isRootSetBoundedAtPlusInfinity(roots);
    case "decay-plus-infinity":
      return isRootSetDecayAtPlusInfinity(roots);
    case "bounded-minus-infinity":
      return isRootSetBoundedAtMinusInfinity(roots);
    case "decay-minus-infinity":
      return isRootSetDecayAtMinusInfinity(roots);
    default:
      return true;
  }
}

function tokenIsBoundedAtPlusInfinity(token: BasisToken): boolean {
  if (token.kind === "real") {
    if (isPositive(token.real)) {
      return false;
    }
    if (isZero(token.real) && token.power >= 1) {
      return false;
    }
    return true;
  }

  if (isPositive(token.real)) {
    return false;
  }
  return true;
}

function tokenDecaysAtPlusInfinity(token: BasisToken): boolean {
  if (token.kind === "real") {
    return isNegative(token.real);
  }
  return isNegative(token.real);
}

function tokenIsBoundedAtMinusInfinity(token: BasisToken): boolean {
  if (token.kind === "real") {
    if (isNegative(token.real)) {
      return false;
    }
    if (isZero(token.real) && token.power >= 1) {
      return false;
    }
    return true;
  }

  if (isNegative(token.real)) {
    return false;
  }
  return true;
}

function tokenDecaysAtMinusInfinity(token: BasisToken): boolean {
  if (token.kind === "real") {
    return isPositive(token.real);
  }
  return isPositive(token.real);
}

export function detectGivenSolutionBehaviorContradiction(
  givenSolutions: readonly BasisToken[],
  condition: ReconstructionBehaviorCondition,
): ReconstructionImpossibleReason | null {
  if (condition === "none") {
    return null;
  }

  for (const token of givenSolutions) {
    if (condition === "bounded-plus-infinity" && !tokenIsBoundedAtPlusInfinity(token)) {
      return "given-solution-unbounded-plus-infinity";
    }
    if (condition === "decay-plus-infinity" && !tokenDecaysAtPlusInfinity(token)) {
      return "given-solution-does-not-decay-plus-infinity";
    }
    if (condition === "bounded-minus-infinity" && !tokenIsBoundedAtMinusInfinity(token)) {
      return "given-solution-unbounded-minus-infinity";
    }
    if (condition === "decay-minus-infinity" && !tokenDecaysAtMinusInfinity(token)) {
      return "given-solution-does-not-decay-minus-infinity";
    }
  }

  return null;
}

export function behaviorImpossibleReason(
  condition: ReconstructionBehaviorCondition,
): ReconstructionImpossibleReason {
  switch (condition) {
    case "bounded-plus-infinity":
      return "given-solution-unbounded-plus-infinity";
    case "bounded-minus-infinity":
      return "given-solution-unbounded-minus-infinity";
    case "decay-plus-infinity":
      return "given-solution-does-not-decay-plus-infinity";
    case "decay-minus-infinity":
      return "given-solution-does-not-decay-minus-infinity";
    default:
      return "given-solution-unbounded-plus-infinity";
  }
}

export function behaviorInfinityLatex(condition: ReconstructionBehaviorCondition): string | null {
  switch (condition) {
    case "bounded-plus-infinity":
    case "decay-plus-infinity":
      return "x\\to+\\infty";
    case "bounded-minus-infinity":
    case "decay-minus-infinity":
      return "x\\to-\\infty";
    default:
      return null;
  }
}
