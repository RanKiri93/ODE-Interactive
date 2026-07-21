import { EPS } from "../constants";
import type {
  ComplexPairDomain,
  LambdaConstraint,
  RealPairDomain,
  ReconstructionBehaviorCondition,
  SolutionRootGroup,
} from "../types";

function isZero(value: number): boolean {
  return Math.abs(value) < EPS;
}

function extractSingleForcedRealRoot(forcedRoots: readonly SolutionRootGroup[]): number | null {
  if (forcedRoots.length !== 1) {
    return null;
  }
  const group = forcedRoots[0];
  if (group.kind !== "real" || group.multiplicity !== 1) {
    return null;
  }
  return group.real;
}

export function deriveRealPairDomain(
  forcedRoots: readonly SolutionRootGroup[],
  behaviorCondition: ReconstructionBehaviorCondition,
): RealPairDomain {
  const mu = extractSingleForcedRealRoot(forcedRoots);

  switch (behaviorCondition) {
    case "none":
      return "all-real-pairs";
    case "bounded-plus-infinity":
      return mu !== null && isZero(mu) ? "strictly-negative" : "non-positive-not-both-zero";
    case "decay-plus-infinity":
      return "strictly-negative";
    case "bounded-minus-infinity":
      return mu !== null && isZero(mu) ? "strictly-positive" : "non-negative-not-both-zero";
    case "decay-minus-infinity":
      return "strictly-positive";
    default:
      return "all-real-pairs";
  }
}

export function deriveComplexPairDomain(
  forcedRoots: readonly SolutionRootGroup[],
  behaviorCondition: ReconstructionBehaviorCondition,
): ComplexPairDomain {
  let alphaConstraint: LambdaConstraint = "all-real";

  switch (behaviorCondition) {
    case "none":
      alphaConstraint = "all-real";
      break;
    case "bounded-plus-infinity":
      alphaConstraint = "non-positive";
      break;
    case "decay-plus-infinity":
      alphaConstraint = "negative";
      break;
    case "bounded-minus-infinity":
      alphaConstraint = "non-negative";
      break;
    case "decay-minus-infinity":
      alphaConstraint = "positive";
      break;
    default:
      alphaConstraint = "all-real";
  }

  return { alphaConstraint, betaConstraint: "nonzero" };
}

export type TwoParameterDomains = {
  realPairDomain: RealPairDomain;
  complexPairDomain: ComplexPairDomain;
};

export function deriveTwoParameterDomains(
  forcedRoots: readonly SolutionRootGroup[],
  behaviorCondition: ReconstructionBehaviorCondition,
): TwoParameterDomains {
  return {
    realPairDomain: deriveRealPairDomain(forcedRoots, behaviorCondition),
    complexPairDomain: deriveComplexPairDomain(forcedRoots, behaviorCondition),
  };
}

function satisfiesRealPairDomain(lambda1: number, lambda2: number, domain: RealPairDomain): boolean {
  switch (domain) {
    case "all-real-pairs":
      return true;
    case "strictly-negative":
      return lambda1 < 0 && lambda2 < 0;
    case "strictly-positive":
      return lambda1 > 0 && lambda2 > 0;
    case "non-positive-not-both-zero":
      return lambda1 <= 0 && lambda2 <= 0 && !(isZero(lambda1) && isZero(lambda2));
    case "non-negative-not-both-zero":
      return lambda1 >= 0 && lambda2 >= 0 && !(isZero(lambda1) && isZero(lambda2));
    default:
      return false;
  }
}

function satisfiesAlphaConstraint(alpha: number, constraint: LambdaConstraint): boolean {
  switch (constraint) {
    case "all-real":
      return true;
    case "negative":
      return alpha < 0;
    case "non-positive":
      return alpha <= 0;
    case "positive":
      return alpha > 0;
    case "non-negative":
      return alpha >= 0;
    default:
      return false;
  }
}

const REAL_PAIR_SAMPLES: Array<[number, number]> = [
  [1, 2],
  [-1, -2],
  [-1, 0],
  [0, 1],
  [1, 1],
  [0, -1],
];

export function realPairDomainIsNonempty(domain: RealPairDomain): boolean {
  return REAL_PAIR_SAMPLES.some(([lambda1, lambda2]) =>
    satisfiesRealPairDomain(lambda1, lambda2, domain),
  );
}

export function complexPairDomainIsNonempty(domain: ComplexPairDomain): boolean {
  return [-1, 0, 1].some((alpha) => satisfiesAlphaConstraint(alpha, domain.alphaConstraint));
}

export function twoParameterDomainsAreAdmissible(domains: TwoParameterDomains): boolean {
  return (
    realPairDomainIsNonempty(domains.realPairDomain) &&
    complexPairDomainIsNonempty(domains.complexPairDomain)
  );
}

export { extractSingleForcedRealRoot };
