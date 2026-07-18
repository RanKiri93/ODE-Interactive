import { analyzeStability } from "../app/constant-coefficients-euler/math/stability";
import { evaluateStabilityAnswer, defaultStabilityAnswer } from "../app/constant-coefficients-euler/practice/stabilityEvaluation";
import type { SolutionRootGroup } from "../app/constant-coefficients-euler/types";

const cases: Array<{
  name: string;
  groups: SolutionRootGroup[];
  classification: string;
  reason: string;
}> = [
  {
    name: "Case1",
    groups: [
      { kind: "real", real: -1, multiplicity: 1 },
      { kind: "real", real: -2, multiplicity: 1 },
    ],
    classification: "asymptotically-stable",
    reason: "all-strictly-negative",
  },
  {
    name: "Case2",
    groups: [
      { kind: "real", real: 0, multiplicity: 1 },
      { kind: "real", real: -2, multiplicity: 1 },
    ],
    classification: "stable-not-asymptotic",
    reason: "simple-imaginary-axis-roots",
  },
  {
    name: "Case3",
    groups: [{ kind: "complex", real: 0, imagAbs: 1, multiplicity: 1 }],
    classification: "stable-not-asymptotic",
    reason: "simple-imaginary-axis-roots",
  },
  {
    name: "Case4",
    groups: [{ kind: "real", real: 0, multiplicity: 2 }],
    classification: "unstable",
    reason: "repeated-imaginary-axis-root",
  },
  {
    name: "Case5",
    groups: [{ kind: "complex", real: 0, imagAbs: 1, multiplicity: 2 }],
    classification: "unstable",
    reason: "repeated-imaginary-axis-root",
  },
  {
    name: "Case6",
    groups: [
      { kind: "real", real: 1, multiplicity: 1 },
      { kind: "real", real: -2, multiplicity: 1 },
    ],
    classification: "unstable",
    reason: "positive-real-part-root",
  },
  {
    name: "Case7",
    groups: [
      { kind: "real", real: 1, multiplicity: 1 },
      { kind: "complex", real: 0, imagAbs: 1, multiplicity: 2 },
    ],
    classification: "unstable",
    reason: "positive-real-part-root",
  },
  {
    name: "Case8",
    groups: [{ kind: "complex", real: -1, imagAbs: 2, multiplicity: 1 }],
    classification: "asymptotically-stable",
    reason: "all-strictly-negative",
  },
];

let failed = 0;

for (const spec of cases) {
  const analysis = analyzeStability(spec.groups);
  const ok = analysis.classification === spec.classification && analysis.reason === spec.reason;
  console.log(ok ? "OK" : "FAIL", spec.name, analysis.classification, analysis.reason);
  if (!ok) {
    failed += 1;
  }
}

const eval1 = evaluateStabilityAnswer(
  { classification: "asymptotically-stable", reason: "all-strictly-negative" },
  cases[0].groups,
);
console.log(eval1.isCorrect ? "OK" : "FAIL", "eval-correct");

const eval2 = evaluateStabilityAnswer(defaultStabilityAnswer(), cases[0].groups);
console.log(!eval2.isCorrect && eval2.message.includes("סיווג") ? "OK" : "FAIL", "eval-empty");

process.exit(failed > 0 ? 1 : 0);
