import { EPS } from "../constants";
import { convertPowerToFalling } from "./eulerConversion";
import { expandPolynomialFromGroups, multiplyPoly } from "./polynomial";
import {
  behaviorImpossibleReason,
  detectGivenSolutionBehaviorContradiction,
  isForcedRootSetCompatibleWithBehavior,
} from "./reconstructionBehavior";
import type {
  AffineCoefficient,
  BasisToken,
  ComplexPairDomain,
  EquationKind,
  GivenSolutionExpression,
  LambdaConstraint,
  RealPairDomain,
  ReconstructionBehaviorCondition,
  ReconstructionFeasibilityAnalysis,
  ReconstructionImpossibleReason,
  SolutionRootGroup,
} from "../types";
import {
  complexRootIdentityKey,
  mergeForcedRootRequirementsByMaximumMultiplicity,
  realRootIdentityKey,
} from "./rootCanonicalization";
import { flattenGivenSolutionExpressions } from "./givenSolutionExpression";
import {
  deriveComplexPairDomain,
  deriveRealPairDomain,
  extractSingleForcedRealRoot,
} from "./parameterDomains";

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

export function deriveLambdaConstraint(
  forcedRoots: readonly SolutionRootGroup[],
  behaviorCondition: ReconstructionBehaviorCondition,
): LambdaConstraint {
  switch (behaviorCondition) {
    case "none":
      return "all-real";
    case "bounded-plus-infinity":
      return hasSimpleZeroRoot(forcedRoots) ? "negative" : "non-positive";
    case "bounded-minus-infinity":
      return hasSimpleZeroRoot(forcedRoots) ? "positive" : "non-negative";
    case "decay-plus-infinity":
      return "negative";
    case "decay-minus-infinity":
      return "positive";
    default:
      return "all-real";
  }
}

export { isForcedRootSetCompatibleWithBehavior } from "./reconstructionBehavior";

export function analyzeReconstructionFeasibilityFromForcedRoots(params: {
  order: number;
  forcedRoots: SolutionRootGroup[];
  behaviorCondition: ReconstructionBehaviorCondition;
  givenSolutions?: BasisToken[];
}): ReconstructionFeasibilityAnalysis {
  const forcedDegree = rootGroupsDegree(params.forcedRoots);

  if (forcedDegree > params.order) {
    return {
      feasible: false,
      reason: "forced-degree-exceeds-order",
      forcedRoots: params.forcedRoots,
      forcedDegree,
    };
  }

  if (params.givenSolutions && params.behaviorCondition !== "none") {
    const givenContradiction = detectGivenSolutionBehaviorContradiction(
      params.givenSolutions,
      params.behaviorCondition,
    );
    if (givenContradiction) {
      return {
        feasible: false,
        reason: givenContradiction,
        forcedRoots: params.forcedRoots,
        forcedDegree,
      };
    }
  }

  if (!isForcedRootSetCompatibleWithBehavior(params.forcedRoots, params.behaviorCondition)) {
    return {
      feasible: false,
      reason: behaviorImpossibleReason(params.behaviorCondition),
      forcedRoots: params.forcedRoots,
      forcedDegree,
    };
  }

  return {
    feasible: true,
    reason: null,
    forcedRoots: params.forcedRoots,
    forcedDegree,
  };
}

export function analyzeReconstructionFeasibility(params: {
  order: number;
  givenSolutions: BasisToken[];
  behaviorCondition: ReconstructionBehaviorCondition;
}): ReconstructionFeasibilityAnalysis {
  const forcedRoots = inferForcedRootGroups(params.givenSolutions);
  return analyzeReconstructionFeasibilityFromForcedRoots({
    order: params.order,
    forcedRoots,
    behaviorCondition: params.behaviorCondition,
    givenSolutions: params.givenSolutions,
  });
}

export function inferForcedRootGroupsFromExpressions(
  expressions: readonly GivenSolutionExpression[],
): SolutionRootGroup[] {
  return inferForcedRootGroups(flattenGivenSolutionExpressions(expressions));
}

export function analyzeReconstructionFeasibilityFromExpressions(params: {
  order: number;
  givenSolutionExpressions: GivenSolutionExpression[];
  behaviorCondition: ReconstructionBehaviorCondition;
}): ReconstructionFeasibilityAnalysis {
  const givenSolutions = flattenGivenSolutionExpressions(params.givenSolutionExpressions);
  const forcedRoots = inferForcedRootGroups(givenSolutions);
  return analyzeReconstructionFeasibilityFromForcedRoots({
    order: params.order,
    forcedRoots,
    behaviorCondition: params.behaviorCondition,
    givenSolutions,
  });
}

export function analyzeReconstructionFromExpressions(params: {
  equationKind: EquationKind;
  order: number;
  givenSolutionExpressions: GivenSolutionExpression[];
  behaviorCondition: ReconstructionBehaviorCondition;
}): ReconstructionAnalysis {
  const givenSolutions = flattenGivenSolutionExpressions(params.givenSolutionExpressions);
  return analyzeReconstruction({
    equationKind: params.equationKind,
    order: params.order,
    givenSolutions,
    behaviorCondition: params.behaviorCondition,
  });
}

export function computeLambdaConstraint(
  forcedRoots: readonly SolutionRootGroup[],
  behaviorCondition: ReconstructionBehaviorCondition,
): LambdaConstraint {
  return deriveLambdaConstraint(forcedRoots, behaviorCondition);
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
      kind: "two-parameter";
      forcedRoots: SolutionRootGroup[];
      forcedRealRoot: number;
      realPairDomain: RealPairDomain;
      complexPairDomain: ComplexPairDomain;
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
  givenSolutions: BasisToken[],
): ReconstructionImpossibleReason | null {
  const feasibility = analyzeReconstructionFeasibilityFromForcedRoots({
    order,
    forcedRoots,
    behaviorCondition,
    givenSolutions,
  });
  return feasibility.reason;
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
    params.givenSolutions,
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
      lambdaConstraint: deriveLambdaConstraint(forcedRoots, params.behaviorCondition),
      polynomialFamily,
      equationFamily,
    };
  }

  if (forcedDegree === params.order - 2) {
    const forcedRealRoot = extractSingleForcedRealRoot(forcedRoots);
    if (forcedRealRoot === null) {
      return {
        kind: "impossible",
        forcedRoots,
        reason: "forced-degree-exceeds-order",
      };
    }

    return {
      kind: "two-parameter",
      forcedRoots,
      forcedRealRoot,
      realPairDomain: deriveRealPairDomain(forcedRoots, params.behaviorCondition),
      complexPairDomain: deriveComplexPairDomain(forcedRoots, params.behaviorCondition),
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
