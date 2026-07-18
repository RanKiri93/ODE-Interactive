import { convertPowerToFalling, convertFallingToPower } from "../app/constant-coefficients-euler/math/eulerConversion";
import { expandPolynomialFromGroups, formatEulerEquation } from "../app/constant-coefficients-euler/math/polynomial";
import {
  expectedBasisTokensFromGroups,
  formatBasisTokenPreview,
} from "../app/constant-coefficients-euler/math/basis";
import { buildEulerTransformationPracticeQuestion } from "../app/constant-coefficients-euler/practice/eulerQuestionGeneration";
import type { SolutionRootGroup } from "../app/constant-coefficients-euler/types";

const specCases: Array<{
  name: string;
  groups: SolutionRootGroup[];
  expectedPoly: number[];
  expectedEuler: number[];
}> = [
  {
    name: "Case1",
    groups: [
      { kind: "real", real: 1, multiplicity: 1 },
      { kind: "real", real: 2, multiplicity: 1 },
    ],
    expectedPoly: [2, -3, 1],
    expectedEuler: [2, -2, 1],
  },
  {
    name: "Case2",
    groups: [{ kind: "real", real: 0, multiplicity: 2 }],
    expectedPoly: [0, 0, 1],
    expectedEuler: [0, 1, 1],
  },
  {
    name: "Case3",
    groups: [{ kind: "complex", real: 0, imagAbs: 1, multiplicity: 1 }],
    expectedPoly: [1, 0, 1],
    expectedEuler: [1, 1, 1],
  },
  {
    name: "Case4",
    groups: [{ kind: "complex", real: -1, imagAbs: 2, multiplicity: 1 }],
    expectedPoly: [5, 2, 1],
    expectedEuler: [5, 3, 1],
  },
  {
    name: "Case5",
    groups: [{ kind: "complex", real: 0, imagAbs: 1, multiplicity: 2 }],
    expectedPoly: [1, 0, 2, 0, 1],
    expectedEuler: [1, 3, 9, 6, 1],
  },
];

function close(a: number, b: number) {
  return Math.abs(a - b) < 1e-9;
}

function vecEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => close(value, b[index] ?? 0));
}

let failed = 0;

for (const spec of specCases) {
  const poly = expandPolynomialFromGroups(spec.groups);
  const euler = convertPowerToFalling(poly);
  const roundTrip = convertFallingToPower(euler);
  const basis = expectedBasisTokensFromGroups(spec.groups);
  const ok =
    vecEqual(poly, spec.expectedPoly) &&
    vecEqual(euler, spec.expectedEuler) &&
    vecEqual(poly, roundTrip);

  if (!ok) {
    failed += 1;
    console.log("FAIL", spec.name, poly, euler);
  } else {
    console.log("OK", spec.name, formatEulerEquation(euler));
    console.log(
      "  y-basis:",
      basis.map((t) => formatBasisTokenPreview(t, "euler-x")).join(" | "),
    );
  }
}

for (const seed of [104139, 104140, 104141]) {
  const q = buildEulerTransformationPracticeQuestion(3, "medium", seed);
  const ok = q.expectedBasis.length === q.degree;
  if (!ok) {
    failed += 1;
  }
  console.log(ok ? "OK" : "FAIL", "seed", seed);
}

process.exit(failed > 0 ? 1 : 0);
