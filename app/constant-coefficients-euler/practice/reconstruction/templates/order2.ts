import type { Order2ReconstructionTemplate } from "./shared";
import {
  COMPLEX_REAL_PARTS,
  NONZERO_COMBINATION_COEFFICIENTS,
  NONZERO_SHIFTS,
  NEGATIVE_ROOTS,
  NON_NEGATIVE_ROOTS,
  NON_POSITIVE_ROOTS,
  POSITIVE_FREQUENCIES,
  POSITIVE_ROOTS,
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

function validateDistinctRoots(params: { realRootA?: number; realRootB?: number }): boolean {
  return params.realRootA !== undefined && params.realRootB !== undefined && params.realRootA !== params.realRootB;
}

export const ORDER2_RECONSTRUCTION_TEMPLATES: Order2ReconstructionTemplate[] = [
  {
    id: "O2-F01",
    difficulty: "easy",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: [],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, SMALL_REAL_ROOTS) }),
    validateParameters: (params) => params.realRootA !== undefined,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "all-real",
  },
  {
    id: "O2-F02-easy",
    difficulty: "easy",
    outcome: "feasible-unique",
    weight: 1,
    pedagogicalTags: ["repeated-root"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, SMALL_REAL_ROOTS) }),
    validateParameters: (params) => params.realRootA !== undefined,
    givenSolutions: (params) => [realToken(params.realRootA!, 1)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 2)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F02-shifted",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.7,
    pedagogicalTags: ["repeated-root", "linear-combination"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
      shift: pickFrom(rng, NONZERO_SHIFTS),
    }),
    validateParameters: (params) =>
      params.realRootA !== undefined && params.shift !== undefined && params.shift !== 0,
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
    expectedDetermination: "unique",
  },
  {
    id: "O2-F03-pure",
    difficulty: "easy",
    outcome: "feasible-unique",
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
    expectedDetermination: "unique",
  },
  {
    id: "O2-F03-combination",
    difficulty: "hard",
    outcome: "feasible-unique",
    weight: 0.6,
    pedagogicalTags: ["complex-pair", "linear-combination"],
    sampleParameters: (rng) => {
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return {
        complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
        frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
        coefficientA,
        coefficientB,
      };
    },
    validateParameters: (params) =>
      validateFrequency(params) &&
      params.coefficientA !== undefined &&
      params.coefficientB !== undefined &&
      params.coefficientA !== 0 &&
      params.coefficientB !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          {
            coefficient: params.coefficientA!,
            token: {
              kind: "complex-cos",
              real: params.complexRealPart!,
              imagAbs: params.frequency!,
              power: 0,
            },
          },
          {
            coefficient: params.coefficientB!,
            token: {
              kind: "complex-sin",
              real: params.complexRealPart!,
              imagAbs: params.frequency!,
              power: 0,
            },
          },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [complexRoot(params.complexRealPart!, params.frequency!, 1)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F04-separate",
    difficulty: "easy",
    outcome: "feasible-unique",
    weight: 1,
    pedagogicalTags: [],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      return { realRootA, realRootB };
    },
    validateParameters: validateDistinctRoots,
    givenSolutions: (params) => [realToken(params.realRootA!, 0), realToken(params.realRootB!, 0)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F04-combination",
    difficulty: "hard",
    outcome: "feasible-unique",
    weight: 0.6,
    pedagogicalTags: ["linear-combination"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return { realRootA, realRootB, coefficientA, coefficientB };
    },
    validateParameters: (params) =>
      validateDistinctRoots(params) &&
      params.coefficientA !== undefined &&
      params.coefficientB !== undefined,
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
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 1),
    ],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F05",
    difficulty: "medium",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "non-positive",
  },
  {
    id: "O2-F06",
    difficulty: "hard",
    outcome: "feasible-one-real-root",
    weight: 0.7,
    pedagogicalTags: ["zero-collision", "behavior-essential"],
    sampleParameters: () => ({ realRootA: 0 }),
    validateParameters: (params) => params.realRootA === 0,
    givenSolutions: () => [realToken(0, 0)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: () => [realRoot(0, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "negative",
  },
  {
    id: "O2-F07",
    difficulty: "medium",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "non-negative",
  },
  {
    id: "O2-F08",
    difficulty: "hard",
    outcome: "feasible-one-real-root",
    weight: 0.7,
    pedagogicalTags: ["zero-collision", "behavior-essential"],
    sampleParameters: () => ({ realRootA: 0 }),
    validateParameters: (params) => params.realRootA === 0,
    givenSolutions: () => [realToken(0, 0)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: () => [realRoot(0, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "positive",
  },
  {
    id: "O2-F09",
    difficulty: "medium",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "decay-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "negative",
  },
  {
    id: "O2-F10",
    difficulty: "medium",
    outcome: "feasible-one-real-root",
    weight: 1,
    pedagogicalTags: ["behavior-essential"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 0)],
    behaviorCondition: () => "decay-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 1)],
    expectedDetermination: "one-real-parameter",
    expectedLambdaConstraint: () => "positive",
  },
  {
    id: "O2-F11-easy",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.4,
    pedagogicalTags: ["repeated-root", "behavior-redundant"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, NEGATIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 1)],
    behaviorCondition: () => "decay-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 2)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F11-shifted",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.4,
    pedagogicalTags: ["repeated-root", "behavior-redundant", "linear-combination"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, NEGATIVE_ROOTS),
      shift: pickFrom(rng, NONZERO_SHIFTS),
    }),
    validateParameters: (params) => (params.realRootA ?? 0) < 0 && params.shift !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: 1, token: { kind: "real", real: params.realRootA!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootA!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "decay-plus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 2)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F12-easy",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.4,
    pedagogicalTags: ["repeated-root", "behavior-redundant"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, POSITIVE_ROOTS) }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0,
    givenSolutions: (params) => [realToken(params.realRootA!, 1)],
    behaviorCondition: () => "decay-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 2)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F12-shifted",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.4,
    pedagogicalTags: ["repeated-root", "behavior-redundant", "linear-combination"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, POSITIVE_ROOTS),
      shift: pickFrom(rng, NONZERO_SHIFTS),
    }),
    validateParameters: (params) => (params.realRootA ?? 0) > 0 && params.shift !== 0,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: 1, token: { kind: "real", real: params.realRootA!, power: 1 } },
          { coefficient: params.shift!, token: { kind: "real", real: params.realRootA!, power: 0 } },
        ],
      },
    ],
    behaviorCondition: () => "decay-minus-infinity",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 2)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F13",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.4,
    pedagogicalTags: ["complex-pair", "behavior-redundant"],
    sampleParameters: (rng) => ({
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [trigToken(0, params.frequency!, 0, params.useCosine ?? true)],
    behaviorCondition: () => "bounded-plus-infinity",
    declaredForcedRoots: (params) => [complexRoot(0, params.frequency!, 1)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-F14",
    difficulty: "medium",
    outcome: "feasible-unique",
    weight: 0.4,
    pedagogicalTags: ["complex-pair", "behavior-redundant"],
    sampleParameters: (rng) => ({
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [trigToken(0, params.frequency!, 0, params.useCosine ?? true)],
    behaviorCondition: () => "bounded-minus-infinity",
    declaredForcedRoots: (params) => [complexRoot(0, params.frequency!, 1)],
    expectedDetermination: "unique",
  },
  {
    id: "O2-I01",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => ({
      complexRealPart: pickFrom(rng, COMPLEX_REAL_PARTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [
      trigToken(params.complexRealPart!, params.frequency!, 1, params.useCosine ?? true),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [complexRoot(params.complexRealPart!, params.frequency!, 2)],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I02",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => ({
      realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
      frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
      useCosine: rng.next() < 0.5,
    }),
    validateParameters: validateFrequency,
    givenSolutions: (params) => [
      realToken(params.realRootA!, 0),
      trigToken(0, params.frequency!, 0, params.useCosine ?? true),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      complexRoot(0, params.frequency!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I03",
    difficulty: "medium",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [frequency, secondFrequency] = pickDistinct(rng, POSITIVE_FREQUENCIES, 2);
      return { frequency, secondFrequency, useCosine: rng.next() < 0.5 };
    },
    validateParameters: (params) =>
      validateFrequency(params) &&
      params.secondFrequency !== undefined &&
      params.frequency !== params.secondFrequency,
    givenSolutions: (params) => [
      trigToken(0, params.frequency!, 0, true),
      trigToken(0, params.secondFrequency!, 0, params.useCosine ?? false),
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      complexRoot(0, params.frequency!, 1),
      complexRoot(0, params.secondFrequency!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I04",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      return { realRootA, realRootB };
    },
    validateParameters: validateDistinctRoots,
    givenSolutions: (params) => [realToken(params.realRootA!, 0), realToken(params.realRootB!, 1)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 2),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I05",
    difficulty: "easy",
    outcome: "infeasible",
    weight: 1,
    pedagogicalTags: ["degree-contradiction"],
    sampleParameters: (rng) => ({ realRootA: pickFrom(rng, SMALL_REAL_ROOTS) }),
    validateParameters: (params) => params.realRootA !== undefined,
    givenSolutions: (params) => [realToken(params.realRootA!, 2)],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [realRoot(params.realRootA!, 3)],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I06",
    difficulty: "hard",
    outcome: "infeasible",
    weight: 0.6,
    pedagogicalTags: ["degree-contradiction", "linear-combination"],
    sampleParameters: (rng) => {
      const [realRootA, realRootB] = pickDistinct(rng, SMALL_REAL_ROOTS, 2);
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return { realRootA, realRootB, coefficientA, coefficientB };
    },
    validateParameters: (params) =>
      validateDistinctRoots(params) &&
      params.coefficientA !== undefined &&
      params.coefficientB !== undefined,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: params.coefficientA!, token: { kind: "real", real: params.realRootA!, power: 0 } },
          { coefficient: params.coefficientB!, token: { kind: "real", real: params.realRootB!, power: 1 } },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      realRoot(params.realRootB!, 2),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I07",
    difficulty: "hard",
    outcome: "infeasible",
    weight: 0.6,
    pedagogicalTags: ["degree-contradiction", "linear-combination"],
    sampleParameters: (rng) => {
      const [coefficientA, coefficientB] = pickDistinct(rng, NONZERO_COMBINATION_COEFFICIENTS, 2);
      return {
        realRootA: pickFrom(rng, SMALL_REAL_ROOTS),
        frequency: pickFrom(rng, POSITIVE_FREQUENCIES),
        coefficientA,
        coefficientB,
        useCosine: rng.next() < 0.5,
      };
    },
    validateParameters: (params) =>
      validateFrequency(params) &&
      params.coefficientA !== undefined &&
      params.coefficientB !== undefined,
    givenSolutions: (params) => [
      {
        kind: "linear-combination",
        terms: [
          { coefficient: params.coefficientA!, token: { kind: "real", real: params.realRootA!, power: 0 } },
          {
            coefficient: params.coefficientB!,
            token: {
              kind: params.useCosine ? "complex-cos" : "complex-sin",
              real: 0,
              imagAbs: params.frequency!,
              power: 0,
            },
          },
        ],
      },
    ],
    behaviorCondition: () => "none",
    declaredForcedRoots: (params) => [
      realRoot(params.realRootA!, 1),
      complexRoot(0, params.frequency!, 1),
    ],
    expectedInfeasibilityReason: () => "forced-degree-exceeds-order",
  },
  {
    id: "O2-I08",
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
    id: "O2-I09",
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
    id: "O2-I10",
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
    id: "O2-I11",
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
    id: "O2-I12",
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
    id: "O2-I13",
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
    id: "O2-I14",
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
    id: "O2-I15",
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
];

export function getOrder2TemplateById(id: string): Order2ReconstructionTemplate | undefined {
  return ORDER2_RECONSTRUCTION_TEMPLATES.find((template) => template.id === id);
}
