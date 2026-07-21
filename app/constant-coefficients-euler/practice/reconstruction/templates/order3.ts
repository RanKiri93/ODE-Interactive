import type { Order3ReconstructionTemplate } from "./shared";
import {
  COMPLEX_REAL_PARTS,
  NEGATIVE_ROOTS,
  NONZERO_COMBINATION_COEFFICIENTS,
  NONZERO_SHIFTS,
  NON_NEGATIVE_ROOTS,
  NON_POSITIVE_ROOTS,
  POSITIVE_FREQUENCIES,
  POSITIVE_ROOTS,
  SHIFTS,
  SMALL_REAL_ROOTS,
  complexRoot,
  pickDistinct,
  pickFrom,
  realRoot,
  realToken,
  trigToken,
} from "./shared";

function validateFrequency(params: { frequency?: number }): boolean {
  return (params.frequency ?? 0) > 0;
}

function validateDistinctPair(params: { realRootA?: number; realRootB?: number }): boolean {
  return (
    params.realRootA !== undefined &&
    params.realRootB !== undefined &&
    params.realRootA !== params.realRootB
  );
}

function validateDistinctTriple(params: {
  realRootA?: number;
  realRootB?: number;
  realRootC?: number;
}): boolean {
  const { realRootA, realRootB, realRootC } = params;
  return (
    realRootA !== undefined &&
    realRootB !== undefined &&
    realRootC !== undefined &&
    new Set([realRootA, realRootB, realRootC]).size === 3
  );
}

function validateDistinctQuadruple(params: {
  realRootA?: number;
  realRootB?: number;
  realRootC?: number;
  realRootD?: number;
}): boolean {
  const { realRootA, realRootB, realRootC, realRootD } = params;
  return (
    realRootA !== undefined &&
    realRootB !== undefined &&
    realRootC !== undefined &&
    realRootD !== undefined &&
    new Set([realRootA, realRootB, realRootC, realRootD]).size === 4
  );
}

function trigCombination(
  real: number,
  frequency: number,
  coefficientA: number,
  coefficientB: number,
  useCosine: boolean,
) {
  return {
    kind: "linear-combination" as const,
    terms: [
      {
        coefficient: coefficientA,
        token: {
          kind: useCosine ? ("complex-cos" as const) : ("complex-sin" as const),
          real,
          imagAbs: frequency,
          power: 0,
        },
      },
      {
        coefficient: coefficientB,
        token: {
          kind: useCosine ? ("complex-sin" as const) : ("complex-cos" as const),
          real,
          imagAbs: frequency,
          power: 0,
        },
      },
    ],
  };
}

function tripleRootExpression(real: number, shift: number, constantTerm: number) {
  const terms: Array<{ coefficient: number; token: { kind: "real"; real: number; power: number } }> =
    [{ coefficient: 1, token: { kind: "real", real, power: 2 } }];
  if (shift !== 0) {
    terms.push({ coefficient: shift, token: { kind: "real", real, power: 1 } });
  }
  if (constantTerm !== 0) {
    terms.push({ coefficient: constantTerm, token: { kind: "real", real, power: 0 } });
  }
  if (terms.length === 1) {
    return { kind: "basis-token" as const, token: terms[0]!.token };
  }
  return { kind: "linear-combination" as const, terms };
}

export const ORDER3_RECONSTRUCTION_TEMPLATES: Order3ReconstructionTemplate[] = [
  {
    id: "O3-U01-easy",
    difficulty: "easy",
    outcome: "feasible-unique",
    weight: 1,
    pedagogicalTags: [],
    sampleParameters: (rng) => {
      const [realRootA, realRootB, realRootC] = pickDistinct(rng, SMALL_REAL_ROOTS, 3);
      return { realRootA, realRootB, realRootC };
    },
    validateParameters: validateDistinctTriple,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      realToken(params.realRootB!, 0),
      realToken(params.realRootC!, 0),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
      realRoot(params.realRootC!, 1),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O3-U01-hard",
    difficulty: "hard",
    outcome: "feasible-unique",
    weight: 0.6,
    pedagogicalTags: ["linear-combination"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB, realRootC] = pickDistinct(rng, SMALL_REAL_ROOTS, 3);
      const [coefficientA, coefficientB, coefficientC] = pickDistinct(
        rng,
        NONZERO_COMBINATION_COEFFICIENTS,
        3,
      );
      return { realRootA, realRootB, realRootC, coefficientA, coefficientB, coefficientC };
    },
    validateParameters: (params) =>
      validateDistinctTriple(params) &&
      params.coefficientA !== 0 &&
      params.coefficientB !== 0 &&
      params.coefficientC !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: params.coefficientA!, token: { kind: "real", real: params.realRootA!, power: 0 } },
          { coefficient: params.coefficientB!, token: { kind: "real", real: params.realRootB!, power: 0 } },
          { coefficient: params.coefficientC!, token: { kind: "real", real: params.realRootC!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
      realRoot(params.realRootC!, 1),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O3-U02-easy",
    difficulty: "easy",
    outcome: "feasible-unique",
    weight: 1,
    pedagogicalTags: ["repeated-root"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      return { realRootA, realRootB, shift: pickFrom(rng, SHIFTS) };
    },
    validateParameters: (params) => validateDistinctPair(params) && params.shift !== undefined,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      {
        kind: "linear-combination",
        terms: [
          { coefficient: 1, token: { kind: "real", real: params.realRootB!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootB!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 2),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O3-U02-hard",
    difficulty: "hard",
    outcome: "feasible-unique",
    weight: 0.6,
    pedagogicalTags: ["repeated-root", "linear-combination"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return { realRootA, realRootB, shift: pickFrom(rng, NONZERO_SHIFTS), coefficientA, coefficientB };
    },
    validateParameters: (params) =>
      validateDistinctPair(params) &&
      params.coefficientA !== 0 &&
      params.coefficientB !== 0 &&
      params.shift !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: params.coefficientA!, token: { kind: "real", real: params.realRootA!, power: 0 } },
          { coefficient: 1, token: { kind: "real", real: params.realRootB!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootB!, power: 0 } },
          { coefficient: params.coefficientB!, token: { kind: "real", real: params.realRootB!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 2),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O3-U03",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 1,
    pedagogicalTags: ["repeated-root"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
      shift: pickFrom(rng, SHIFTS),
      constantTerm: pickFrom(rng, SHIFTS),
    }),
    validateParameters: (params) => params.realRootA !== undefined,
    givenSolutions: (params) => [tripleRootExpression(params.realRootA!, params.shift!, params.constantTerm!)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 3)],
    expectedDetermination: "unique",
  },
  {
    id: "O3-U04-easy",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 1,
    pedagogicalTags: ["complex-pair"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
      complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      trigToken(params.complexRealPart!, params.frequency!, 0, params.useCosine ?? true),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      complexRoot(params.complexRealPart!, params.frequency!, 1),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O3-U04-hard",
    difficulty: "hard",
    outcome: "feasible-unique",
    weight: 0.6,
    pedagogicalTags: ["complex-pair", "linear-combination"],
    sampleParameters: (rng) => {
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return {
        realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
        complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
        frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
        coefficientA,
        coefficientB,
        useCosine: rng.next() < 0.5,
      };
    },
    validateParameters: (params) =>
      validateFrequency(params) && params.coefficientA !== 0 && params.coefficientB !== 0,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      trigCombination(
        params.complexRealPart!,
        params.frequency!,
        params.coefficientA!,
        params.coefficientB!,
        params.useCosine ?? true,
      ),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      complexRoot(params.complexRealPart!, params.frequency!, 1),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O3-P01-easy",
    difficulty: "easy",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: [],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      return { realRootA, realRootB };
    },
    validateParameters: validateDistinctPair,
    givenSolutions: (params) => [realToken(params.realRootA!, 0), realToken(params.realRootB!, 0)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1), realRoot(params.realRootB!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "all-real",
  },
  {
    id: "O3-P01-hard",
    difficulty: "hard",
    outcome: "feasible-one-real-root",
    weight: 0.6,
    pedagogicalTags: ["linear-combination"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return { realRootA, realRootB, coefficientA, coefficientB };
    },
    validateParameters: (params) =>
      validateDistinctPair(params) && params.coefficientA !== 0 && params.coefficientB !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: params.coefficientA!, token: { kind: "real", real: params.realRootA!, power: 0 } },
          { coefficient: params.coefficientB!, token: { kind: "real", real: params.realRootB!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1), realRoot(params.realRootB!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "all-real",
  },
  {
    id: "O3-P02",
    difficulty: "easy",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: ["repeated-root"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
      shift: pickFrom(rng, SHIFTS),
    }),
    validateParameters: (params) => params.realRootA !== undefined,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: 1, token: { kind: "real", real: params.realRootA!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootA!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 2)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "all-real",
  },
  {
    id: "O3-P03",
    difficulty: "medium",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: ["complex-pair"],
    sampleParameters: (rng) => ({
      complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [
      trigToken(params.complexRealPart!, params.frequency!, 0, params.useCosine ?? true),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [complexRoot(params.complexRealPart!, params.frequency!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "all-real",
  },
  {
    id: "O3-T01-easy",
    difficulty: "medium",
    outcome: "feasible-two-parameter",
    weight: 1,
    pedagogicalTags: [],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(
        rng,
        SMALL_REAL_ROOTS.filter((value) => value !== 0),
      ),
    }),
    validateParameters: (params) => params.realRootA !== undefined && params.realRootA !== 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "all-real-pairs",
    expectedComplexPairDomain: () => ({ alphaConstraint: "all-real", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-T01-bounded-plus",
    difficulty: "medium",
    outcome: "feasible-two-parameter",
    weight: 0.8,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "non-positive-not-both-zero",
    expectedComplexPairDomain: () => ({ alphaConstraint: "non-positive", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-T01-bounded-minus",
    difficulty: "medium",
    outcome: "feasible-two-parameter",
    weight: 0.8,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "non-negative-not-both-zero",
    expectedComplexPairDomain: () => ({ alphaConstraint: "non-negative", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-T01-decay-plus",
    difficulty: "medium",
    outcome: "feasible-two-parameter",
    weight: 0.8,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "decay-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "strictly-negative",
    expectedComplexPairDomain: () => ({ alphaConstraint: "negative", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-T01-decay-minus",
    difficulty: "medium",
    outcome: "feasible-two-parameter",
    weight: 0.8,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "decay-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "strictly-positive",
    expectedComplexPairDomain: () => ({ alphaConstraint: "positive", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-T01-zero-plus",
    difficulty: "hard",
    outcome: "feasible-two-parameter",
    weight: 0.6,
    pedagogicalTags: ["zero-collision", "behavior-essential"],
    sampleParameters: () => ({ realRootA: 0 }),
    validateParameters: (params) => params.realRootA === 0,
    givenSolutions: () => [realToken(0, 0)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: () => [realRoot(0, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "strictly-negative",
    expectedComplexPairDomain: () => ({ alphaConstraint: "non-positive", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-T01-zero-minus",
    difficulty: "hard",
    outcome: "feasible-two-parameter",
    weight: 0.6,
    pedagogicalTags: ["zero-collision", "behavior-essential"],
    sampleParameters: () => ({ realRootA: 0 }),
    validateParameters: (params) => params.realRootA === 0,
    givenSolutions: () => [realToken(0, 0)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: () => [realRoot(0, 1)],
    expectedDetermination: "two-parameter",
    expectedRealPairDomain: () => "strictly-positive",
    expectedComplexPairDomain: () => ({ alphaConstraint: "non-negative", betaConstraint: "nonzero" }),
  },
  {
    id: "O3-I01-easy",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB, realRootC, realRootD] = pickDistinct(rng, SMALL_REAL_ROOTS, 4);
      return { realRootA, realRootB, realRootC, realRootD };
    },
    validateParameters: validateDistinctQuadruple,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      realToken(params.realRootB!, 0),
      realToken(params.realRootC!, 0),
      realToken(params.realRootD!, 0),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
      realRoot(params.realRootC!, 1),
      realRoot(params.realRootD!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I01-hard",
    difficulty: "hard",
    outcome: "infeasible",
    weight: 0.6,
    pedagogicalTags: ["degree-contradiction", "linear-combination"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB, realRootC, realRootD] = pickDistinct(rng, SMALL_REAL_ROOTS, 4);
      const [coefficientA, coefficientB, coefficientC, coefficientD] = pickDistinct(
        rng,
        [-3, -2, -1, 1, 2, 3] as const,
        4,
      );
      return { realRootA, realRootB, realRootC, realRootD, coefficientA, coefficientB, coefficientC, coefficientD };
    },
    validateParameters: (params) =>
      validateDistinctQuadruple(params) &&
      [params.coefficientA, params.coefficientB, params.coefficientC, params.coefficientD].every(
        (value) => value !== 0,
      ),
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: params.coefficientA!, token: { kind: "real", real: params.realRootA!, power: 0 } },
          { coefficient: params.coefficientB!, token: { kind: "real", real: params.realRootB!, power: 0 } },
          { coefficient: params.coefficientC!, token: { kind: "real", real: params.realRootC!, power: 0 } },
          { coefficient: params.coefficientD!, token: { kind: "real", real: params.realRootD!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
      realRoot(params.realRootC!, 1),
      realRoot(params.realRootD!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I02",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB, realRootC] = pickDistinct(rng, SMALL_REAL_ROOTS, 3);
      return { realRootA, realRootB, realRootC, shift: pickFrom(rng, SHIFTS) };
    },
    validateParameters: validateDistinctTriple,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      realToken(params.realRootB!, 0),
      {
        kind: "linear-combination",
        terms: [
          { coefficient: 1, token: { kind: "real", real: params.realRootC!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootC!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
      realRoot(params.realRootC!, 2),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I03",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      return { realRootA, realRootB, shift: pickFrom(rng, SHIFTS), constantTerm: pickFrom(rng, SHIFTS) };
    },
    validateParameters: validateDistinctPair,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      tripleRootExpression(params.realRootB!, params.shift!, params.constantTerm!),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1), realRoot(params.realRootB!, 3)],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I04",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [frequency, secondFrequency] = pickDistinct(rng, POSITIVE_FREQUENCIES, 2);
      return {
        frequency,
        secondFrequency,
        complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
        secondComplexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
        useCosine: rng.next() < 0.5,
        secondUseCosine: rng.next() < 0.5,
      };
    },
    validateParameters: (params) =>
      validateFrequency(params) &&
      params.secondFrequency !== undefined &&
      params.frequency !== params.secondFrequency,
    givenSolutions: (params) => [
      trigToken(params.complexRealPart!, params.frequency!, 0, true),
      trigToken(params.secondComplexRealPart!, params.secondFrequency!, 0, params.secondUseCosine ?? false),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      complexRoot(params.complexRealPart!, params.frequency!, 1),
      complexRoot(params.secondComplexRealPart!, params.secondFrequency!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I05",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return {
        complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
        frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
        coefficientA,
        coefficientB,
        useCosine: rng.next() < 0.5,
      };
    },
    validateParameters: (params) =>
      validateFrequency(params) && params.coefficientA !== 0 && params.coefficientB !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          {
            coefficient: params.coefficientA!,
            token: {
              kind: params.useCosine ? "complex-cos" : "complex-sin",
              real: params.complexRealPart!,
              imagAbs: params.frequency!,
              power: 1,
            },
          },
          {
            coefficient: params.coefficientB!,
            token: {
              kind: params.useCosine ? "complex-sin" : "complex-cos",
              real: params.complexRealPart!,
              imagAbs: params.frequency!,
              power: 0,
            },
          },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [complexRoot(params.complexRealPart!, params.frequency!, 2)],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I06",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
      complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      shift: pickFrom(rng, SHIFTS),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: 1, token: { kind: "real", real: params.realRootA!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootA!, power: 0 } },
        ],
      },
      trigToken(params.complexRealPart!, params.frequency!, 0, params.useCosine ?? true),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 2),
      complexRoot(params.complexRealPart!, params.frequency!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I07",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, SMALL_REAL_ROOTS) }),
    validateParameters: (params) => params.realRootA !== undefined,
    givenSolutions: (params) => [realToken(params.realRootA!, 3)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 4)],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O3-I08",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedInfeasibilityReason: () => "given-solution-unbounded-plus-infinity",
  },
  {
    id: "O3-I09",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedInfeasibilityReason: () => "given-solution-unbounded-minus-infinity",
  },
  {
    id: "O3-I10",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NON_NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? -1) >= 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "decay-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedInfeasibilityReason: () => "given-solution-does-not-decay-plus-infinity",
  },
  {
    id: "O3-I11",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NON_POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 1) <= 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "decay-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedInfeasibilityReason: () => "given-solution-does-not-decay-minus-infinity",
  },
  {
    id: "O3-I12",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: () => ({}),
    validateParameters: () => true,
    givenSolutions: () => [realToken(0, 1)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: () => [realRoot(0, 2)],
    expectedInfeasibilityReason: () => "given-solution-unbounded-plus-infinity",
  },
  {
    id: "O3-I13",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: () => ({}),
    validateParameters: () => true,
    givenSolutions: () => [realToken(0, 1)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: () => [realRoot(0, 2)],
    expectedInfeasibilityReason: () => "given-solution-unbounded-minus-infinity",
  },
  {
    id: "O3-I14",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [trigToken(0, params.frequency!, 0, params.useCosine ?? true)],
    behaviorCondition: () => "decay-plus-infinity",
    declaredForcedRoots: (params) => [complexRoot(0, params.frequency!, 1)],
    expectedInfeasibilityReason: () => "given-solution-does-not-decay-plus-infinity",
  },
  {
    id: "O3-I15",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [trigToken(0, params.frequency!, 0, params.useCosine ?? true)],
    behaviorCondition: () => "decay-minus-infinity",
    declaredForcedRoots: (params) => [complexRoot(0, params.frequency!, 1)],
    expectedInfeasibilityReason: () => "given-solution-does-not-decay-minus-infinity",
  },
  {
    id: "O3-I16-plus",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 0.7,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({
      complexRealPart: pickFrom(rng, POSITIVE_ROOTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: true,
    }),
    validateParameters: (params) => validateFrequency(params) && (params.complexRealPart ?? 0) > 0,
    givenSolutions: (params) => [trigToken(params.complexRealPart!, params.frequency!, 0, true)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: (params) => [complexRoot(params.complexRealPart!, params.frequency!, 1)],
    expectedInfeasibilityReason: () => "given-solution-unbounded-plus-infinity",
  },
  {
    id: "O3-I16-minus",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 0.7,
    pedagogicalTags: ["behavior-contradiction"],
    sampleParameters: (rng) => ({
      complexRealPart: pickFrom(rng, NEGATIVE_ROOTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: true,
    }),
    validateParameters: (params) => validateFrequency(params) && (params.complexRealPart ?? 0) < 0,
    givenSolutions: (params) => [trigToken(params.complexRealPart!, params.frequency!, 0, true)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: (params) => [complexRoot(params.complexRealPart!, params.frequency!, 1)],
    expectedInfeasibilityReason: () => "given-solution-unbounded-minus-infinity",
  },
];

export function getOrder3TemplateById(id: string): Order3ReconstructionTemplate | undefined {
  return ORDER3_RECONSTRUCTION_TEMPLATES.find((template) => template.id === id);
}
