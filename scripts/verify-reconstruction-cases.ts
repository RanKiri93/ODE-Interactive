import {
  analyzeReconstruction,
  inferForcedRootGroups,
  rootGroupsDegree,
} from "../app/constant-coefficients-euler/math/reconstruction";
import { formatEulerEquation } from "../app/constant-coefficients-euler/math/polynomial";
import type { BasisToken, LambdaConstraint, ReconstructionImpossibleReason } from "../app/constant-coefficients-euler/types";
import { numbersEqual } from "../app/constant-coefficients-euler/utils/formatting";

function coeffsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => numbersEqual(value, b[index] ?? 0));
}

function assertForcedRoots(
  tokens: BasisToken[],
  expected: Array<{ kind: "real"; real: number; mult: number } | { kind: "complex"; real: number; imagAbs: number; mult: number }>,
): boolean {
  const forced = inferForcedRootGroups(tokens);
  if (forced.length !== expected.length) {
    return false;
  }
  for (const spec of expected) {
    const match = forced.find((group) => {
      if (spec.kind === "real") {
        return group.kind === "real" && numbersEqual(group.real, spec.real) && group.multiplicity === spec.mult;
      }
      return (
        group.kind === "complex" &&
        numbersEqual(group.real, spec.real) &&
        numbersEqual(group.imagAbs, spec.imagAbs) &&
        group.multiplicity === spec.mult
      );
    });
    if (!match) {
      return false;
    }
  }
  return true;
}

type CaseSpec = {
  name: string;
  equationKind: "constant-coefficients" | "euler";
  order: number;
  tokens: BasisToken[];
  behavior: "none" | "all-bounded" | "all-decay";
  expectedKind: "unique" | "one-real-parameter" | "impossible";
  expectedPoly?: number[];
  expectedEquation?: number[];
  expectedLambda?: LambdaConstraint;
  expectedReason?: ReconstructionImpossibleReason;
  forcedDegree?: number;
};

const cases: CaseSpec[] = [
  {
    name: "Case1-unique-cc",
    equationKind: "constant-coefficients",
    order: 4,
    tokens: [
      { kind: "complex-sin", real: 0, imagAbs: 1, power: 0 },
      { kind: "complex-sin", real: 0, imagAbs: 1, power: 1 },
    ],
    behavior: "none",
    expectedKind: "unique",
    expectedPoly: [1, 0, 2, 0, 1],
    expectedEquation: [1, 0, 2, 0, 1],
    forcedDegree: 4,
  },
  {
    name: "Case2-unique-euler",
    equationKind: "euler",
    order: 3,
    tokens: [
      { kind: "real", real: 2, power: 0 },
      { kind: "real", real: 2, power: 1 },
      { kind: "real", real: -1, power: 0 },
    ],
    behavior: "none",
    expectedKind: "unique",
    expectedPoly: [4, 0, -3, 1],
    expectedEquation: [4, -2, 0, 1],
    forcedDegree: 3,
  },
  {
    name: "Case3-one-param-all-real",
    equationKind: "constant-coefficients",
    order: 3,
    tokens: [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 0 }],
    behavior: "none",
    expectedKind: "one-real-parameter",
    expectedLambda: "all-real",
    forcedDegree: 2,
  },
  {
    name: "Case4-one-param-bounded",
    equationKind: "constant-coefficients",
    order: 3,
    tokens: [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 0 }],
    behavior: "all-bounded",
    expectedKind: "one-real-parameter",
    expectedLambda: "non-positive",
    forcedDegree: 2,
  },
  {
    name: "Case5-zero-collision-cc",
    equationKind: "constant-coefficients",
    order: 2,
    tokens: [{ kind: "real", real: 0, power: 0 }],
    behavior: "all-bounded",
    expectedKind: "one-real-parameter",
    expectedLambda: "negative",
    forcedDegree: 1,
  },
  {
    name: "Case6-zero-collision-euler",
    equationKind: "euler",
    order: 2,
    tokens: [{ kind: "real", real: 0, power: 0 }],
    behavior: "all-bounded",
    expectedKind: "one-real-parameter",
    expectedLambda: "negative",
    forcedDegree: 1,
  },
  {
    name: "Case7-impossible-degree",
    equationKind: "constant-coefficients",
    order: 3,
    tokens: [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 1 }],
    behavior: "none",
    expectedKind: "impossible",
    expectedReason: "forced-degree-exceeds-order",
    forcedDegree: 4,
  },
  {
    name: "Case8-impossible-decay",
    equationKind: "constant-coefficients",
    order: 3,
    tokens: [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 0 }],
    behavior: "all-decay",
    expectedKind: "impossible",
    expectedReason: "forced-solutions-do-not-decay",
    forcedDegree: 2,
  },
  {
    name: "Case9-impossible-euler-bounded",
    equationKind: "euler",
    order: 3,
    tokens: [{ kind: "real", real: 0, power: 1 }],
    behavior: "all-bounded",
    expectedKind: "impossible",
    expectedReason: "forced-solutions-unbounded",
    forcedDegree: 2,
  },
  {
    name: "Case10-multiplicity-merge",
    equationKind: "constant-coefficients",
    order: 4,
    tokens: [
      { kind: "complex-sin", real: 0, imagAbs: 1, power: 0 },
      { kind: "complex-cos", real: 0, imagAbs: 1, power: 0 },
      { kind: "complex-sin", real: 0, imagAbs: 1, power: 1 },
    ],
    behavior: "none",
    expectedKind: "unique",
    expectedPoly: [1, 0, 2, 0, 1],
    forcedDegree: 4,
  },
];

let failed = 0;

for (const spec of cases) {
  const analysis = analyzeReconstruction({
    equationKind: spec.equationKind,
    order: spec.order,
    givenSolutions: spec.tokens,
    behaviorCondition: spec.behavior,
  });

  let ok = analysis.kind === spec.expectedKind;

  if (spec.forcedDegree !== undefined) {
    ok = ok && rootGroupsDegree(inferForcedRootGroups(spec.tokens)) === spec.forcedDegree;
  }

  if (spec.expectedKind === "unique" && analysis.kind === "unique") {
    if (spec.expectedPoly) {
      ok = ok && coeffsEqual(analysis.polynomialCoefficients, spec.expectedPoly);
    }
    if (spec.expectedEquation) {
      ok = ok && coeffsEqual(analysis.equationCoefficients, spec.expectedEquation);
    }
  }

  if (spec.expectedKind === "one-real-parameter" && analysis.kind === "one-real-parameter") {
    ok = ok && analysis.lambdaConstraint === spec.expectedLambda;
    if (spec.name === "Case6-zero-collision-euler") {
      const eq0 = analysis.equationFamily[0]?.constant ?? NaN;
      const eq1c = analysis.equationFamily[1]?.constant ?? NaN;
      const eq1l = analysis.equationFamily[1]?.lambda ?? NaN;
      ok =
        ok &&
        numbersEqual(eq0, 0) &&
        numbersEqual(eq1c, 1) &&
        numbersEqual(eq1l, -1) &&
        numbersEqual(analysis.equationFamily[2]?.constant ?? NaN, 1);
    }
  }

  if (spec.expectedKind === "impossible" && analysis.kind === "impossible") {
    ok = ok && analysis.reason === spec.expectedReason;
  }

  console.log(ok ? "OK" : "FAIL", spec.name, analysis.kind);
  if (!ok) {
    failed += 1;
    if (analysis.kind === "unique") {
      console.log("  poly", analysis.polynomialCoefficients);
      console.log("  eq", analysis.equationCoefficients);
    }
    if (analysis.kind === "one-real-parameter") {
      console.log("  lambda", analysis.lambdaConstraint, "eqFamily", analysis.equationFamily);
    }
    if (analysis.kind === "impossible") {
      console.log("  reason", analysis.reason);
    }
  }
}

const mergeOk = assertForcedRoots(
  [
    { kind: "complex-sin", real: 0, imagAbs: 1, power: 0 },
    { kind: "complex-cos", real: 0, imagAbs: 1, power: 0 },
    { kind: "complex-sin", real: 0, imagAbs: 1, power: 1 },
  ],
  [{ kind: "complex", real: 0, imagAbs: 1, mult: 2 }],
);
console.log(mergeOk ? "OK" : "FAIL", "merge-multiplicity");
if (!mergeOk) {
  failed += 1;
}

const case2 = analyzeReconstruction({
  equationKind: "euler",
  order: 3,
  givenSolutions: [
    { kind: "real", real: 2, power: 0 },
    { kind: "real", real: 2, power: 1 },
    { kind: "real", real: -1, power: 0 },
  ],
  behaviorCondition: "none",
});
if (case2.kind === "unique") {
  const eqLatex = formatEulerEquation(case2.equationCoefficients);
  const normalized = eqLatex.replace(/\s/g, "");
  const okEq = normalized.includes("-2xy'") && normalized.includes("+4y=0");
  console.log(okEq ? "OK" : "FAIL", "Case2-euler-latex", eqLatex);
  if (!okEq) {
    failed += 1;
  }
}

process.exit(failed > 0 ? 1 : 0);
