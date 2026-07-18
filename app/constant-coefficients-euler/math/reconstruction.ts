import { EPS } from "../constants";
import { convertPowerToFalling } from "./eulerConversion";
import { expandPolynomialFromGroups, multiplyPoly } from "./polynomial";
import { analyzeStability } from "./stability";
import type {
  AffineCoefficient,
  BasisToken,
  EquationKind,
  LambdaConstraint,
  ReconstructionBehaviorCondition,
  ReconstructionImpossibleReason,
  SolutionRootGroup,
} from "../types";
import {
  complexRootIdentityKey,
  mergeForcedRootRequirementsByMaximumMultiplicity,
  realRootIdentityKey,
} from "./rootCanonicalization";

export function rootGroupsDegree(groups: readonly SolutionRootGroup[]): number {
  return groups.reduce(
    (sum, group) => sum + (group.kind === "real" ? group.multiplicity : 2 * group.multiplicity),
    0,
  );
}

export function inferForcedRootGroups(givenSolutions: readonly BasisToken[]): SolutionRootGroup[] {
  const groups = new Map<string, SolutionRootGroup>();

  for (const token of givenSolutions) {
    const requiredMultiplicity = token.power + 1;

    if (token.kind === "real") {
      const key = realRootIdentityKey(token.real);
      const incoming: SolutionRootGroup = {
        kind: "real",
        real: token.real,
        multiplicity: requiredMultiplicity,
      };
      groups.set(
        key,
        mergeForcedRootRequirementsByMaximumMultiplicity(groups.get(key), incoming),
      );
      continue;
    }

    const key = complexRootIdentityKey(token.real, token.imagAbs);
    const incoming: SolutionRootGroup = {
      kind: "complex",
      real: token.real,
      imagAbs: token.imagAbs,
      multiplicity: requiredMultiplicity,
    };
    groups.set(
      key,
      mergeForcedRootRequirementsByMaximumMultiplicity(groups.get(key), incoming),
    );
  }

  return Array.from(groups.values());
}

function isZero(value: number): boolean {
  return Math.abs(value) < EPS;
}

function hasSimpleZeroRoot(forcedRoots: readonly SolutionRootGroup[]): boolean {
  return forcedRoots.some(
    (group) => group.kind === "real" && isZero(group.real) && group.multiplicity === 1,
  );
}

function forcedRootsViolateBoundedness(forcedRoots: readonly SolutionRootGroup[]): boolean {
  const stability = analyzeStability(forcedRoots);
  return stability.classification === "unstable";
}

function forcedRootsViolateDecay(forcedRoots: readonly SolutionRootGroup[]): boolean {
  return forcedRoots.some((group) => group.real >= -EPS);
}

export function computeLambdaConstraint(
  forcedRoots: readonly SolutionRootGroup[],
  behaviorCondition: ReconstructionBehaviorCondition,
): LambdaConstraint {
  if (behaviorCondition === "all-decay") {
    return "negative";
  }

  if (behaviorCondition === "all-bounded") {
    return hasSimpleZeroRoot(forcedRoots) ? "negative" : "non-positive";
  }

  return "all-real";
}

function buildAffineFromLinearFactor(forcedPolynomial: number[]): AffineCoefficient[] {
  const degree = forcedPolynomial.length;
  const result = Array.from({ length: degree + 1 }, () => ({ constant: 0, lambda: 0 }));

  for (let power = 0; power < degree; power += 1) {
    const coefficient = forcedPolynomial[power] ?? 0;
    result[power + 1].constant += coefficient;
    result[power].lambda -= coefficient;
  }

  return result;
}

export function buildAffinePolynomialFamily(forcedPolynomial: number[]): AffineCoefficient[] {
  return buildAffineFromLinearFactor(forcedPolynomial);
}

export function affinePowerToFallingCoefficients(
  coefficients: AffineCoefficient[],
): AffineCoefficient[] {
  const constantPart = coefficients.map((coefficient) => coefficient.constant);
  const lambdaPart = coefficients.map((coefficient) => coefficient.lambda);
  const constantFalling = convertPowerToFalling(constantPart);
  const lambdaFalling = convertPowerToFalling(lambdaPart);
  const degree = Math.max(constantFalling.length, lambdaFalling.length) - 1;

  return Array.from({ length: degree + 1 }, (_, index) => ({
    constant: constantFalling[index] ?? 0,
    lambda: lambdaFalling[index] ?? 0,
  }));
}

export type ReconstructionAnalysis =
  | {
      kind: "unique";
      forcedRoots: SolutionRootGroup[];
      polynomialCoefficients: number[];
      equationCoefficients: number[];
    }
  | {
      kind: "one-real-parameter";
      forcedRoots: SolutionRootGroup[];
      forcedPolynomialCoefficients: number[];
      lambdaConstraint: LambdaConstraint;
      polynomialFamily: AffineCoefficient[];
      equationFamily: AffineCoefficient[];
    }
  | {
      kind: "impossible";
      forcedRoots: SolutionRootGroup[];
      reason: ReconstructionImpossibleReason;
    };

function impossibleReason(
  forcedRoots: SolutionRootGroup[],
  forcedDegree: number,
  order: number,
  behaviorCondition: ReconstructionBehaviorCondition,
): ReconstructionImpossibleReason | null {
  if (forcedDegree > order) {
    return "forced-degree-exceeds-order";
  }

  if (behaviorCondition === "all-bounded" && forcedRootsViolateBoundedness(forcedRoots)) {
    return "forced-solutions-unbounded";
  }

  if (behaviorCondition === "all-decay" && forcedRootsViolateDecay(forcedRoots)) {
    return "forced-solutions-do-not-decay";
  }

  return null;
}

export function analyzeReconstruction(params: {
  equationKind: EquationKind;
  order: number;
  givenSolutions: BasisToken[];
  behaviorCondition: ReconstructionBehaviorCondition;
}): ReconstructionAnalysis {
  const forcedRoots = inferForcedRootGroups(params.givenSolutions);
  const forcedDegree = rootGroupsDegree(forcedRoots);
  const contradiction = impossibleReason(
    forcedRoots,
    forcedDegree,
    params.order,
    params.behaviorCondition,
  );

  if (contradiction) {
    return {
      kind: "impossible",
      forcedRoots,
      reason: contradiction,
    };
  }

  if (forcedDegree === params.order) {
    const polynomialCoefficients = expandPolynomialFromGroups(forcedRoots);
    const equationCoefficients =
      params.equationKind === "euler"
        ? convertPowerToFalling(polynomialCoefficients)
        : polynomialCoefficients;

    return {
      kind: "unique",
      forcedRoots,
      polynomialCoefficients,
      equationCoefficients,
    };
  }

  if (forcedDegree === params.order - 1) {
    const forcedPolynomialCoefficients = expandPolynomialFromGroups(forcedRoots);
    const polynomialFamily = buildAffinePolynomialFamily(forcedPolynomialCoefficients);
    const equationFamily =
      params.equationKind === "euler"
        ? affinePowerToFallingCoefficients(polynomialFamily)
        : polynomialFamily;

    return {
      kind: "one-real-parameter",
      forcedRoots,
      forcedPolynomialCoefficients,
      lambdaConstraint: computeLambdaConstraint(forcedRoots, params.behaviorCondition),
      polynomialFamily,
      equationFamily,
    };
  }

  return {
    kind: "impossible",
    forcedRoots,
    reason: "forced-degree-exceeds-order",
  };
}

export function witnessTokensFromRootGroups(
  groups: SolutionRootGroup[],
  options: { fullLadder?: boolean } = {},
): BasisToken[] {
  const { fullLadder = true } = options;
  const tokens: BasisToken[] = [];

  for (const group of groups) {
    const powers = fullLadder
      ? Array.from({ length: group.multiplicity }, (_, index) => index)
      : [group.multiplicity - 1];

    if (group.kind === "real") {
      for (const power of powers) {
        tokens.push({ kind: "real", real: group.real, power });
      }
      continue;
    }

    for (const power of powers) {
      tokens.push({
        kind: power % 2 === 0 ? "complex-cos" : "complex-sin",
        real: group.real,
        imagAbs: group.imagAbs,
        power,
      });
    }
  }

  return tokens;
}

export function multiplyConstantPolyByLinearRoot(polynomial: number[], root: number): number[] {
  return multiplyPoly(polynomial, [-root, 1]);
}
