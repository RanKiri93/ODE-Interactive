import { basisTokenDerivativeAtZero } from "../app/constant-coefficients-euler/math/basisDerivatives";
import {
  applyInitialConditionMatrix,
  buildInitialConditionMatrix,
  initialConditionMatrixDeterminant,
} from "../app/constant-coefficients-euler/math/initialConditions";
import { buildConstantCoefficientPracticeQuestion } from "../app/constant-coefficients-euler/practice/questionGeneration";
import {
  evaluateInitialCoefficientAnswer,
  formatCombinedSolutionLatex,
} from "../app/constant-coefficients-euler/practice/initialConditionEvaluation";
import type { BasisToken } from "../app/constant-coefficients-euler/types";
import { numbersEqual } from "../app/constant-coefficients-euler/utils/formatting";

function assertDerivative(token: BasisToken, order: number, expected: number, label: string): boolean {
  const value = basisTokenDerivativeAtZero(token, order);
  const ok = numbersEqual(value, expected);
  if (!ok) {
    console.log("FAIL", label, "got", value, "expected", expected);
  }
  return ok;
}

function matrixEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((row, rowIndex) =>
    row.every((value, columnIndex) => numbersEqual(value, b[rowIndex]?.[columnIndex] ?? 0)),
  );
}

let failed = 0;

const case1Basis: BasisToken[] = [
  { kind: "real", real: 1, power: 0 },
  { kind: "real", real: 2, power: 0 },
];
const case1Coeffs = [2, -1];
const case1Matrix = buildInitialConditionMatrix(case1Basis);
const case1Initial = applyInitialConditionMatrix(case1Matrix, case1Coeffs);
const case1Solution = formatCombinedSolutionLatex(case1Basis, case1Coeffs);

const case1Ok =
  matrixEqual(case1Matrix, [
    [1, 1],
    [1, 2],
  ]) &&
  numbersEqual(case1Initial[0], 1) &&
  numbersEqual(case1Initial[1], 0) &&
  (case1Solution.includes("e^{x}") || case1Solution.includes("e^x")) &&
  case1Solution.includes("e^{2x}");
console.log(case1Ok ? "OK" : "FAIL", "Case1-distinct-real");
if (!case1Ok) {
  failed += 1;
}

const case2Basis: BasisToken[] = [
  { kind: "real", real: 1, power: 0 },
  { kind: "real", real: 1, power: 1 },
];
const case2Coeffs = [1, 2];
const case2Initial = applyInitialConditionMatrix(buildInitialConditionMatrix(case2Basis), case2Coeffs);
const case2Ok = numbersEqual(case2Initial[0], 1) && numbersEqual(case2Initial[1], 3);
console.log(case2Ok ? "OK" : "FAIL", "Case2-repeated-real");
if (!case2Ok) {
  failed += 1;
}

const case3Basis: BasisToken[] = [
  { kind: "complex-cos", real: 0, imagAbs: 1, power: 0 },
  { kind: "complex-sin", real: 0, imagAbs: 1, power: 0 },
];
const case3Coeffs = [3, -2];
const case3Initial = applyInitialConditionMatrix(buildInitialConditionMatrix(case3Basis), case3Coeffs);
const case3Ok =
  numbersEqual(case3Initial[0], 3) &&
  numbersEqual(case3Initial[1], -2) &&
  formatCombinedSolutionLatex(case3Basis, case3Coeffs).includes("\\cos");
console.log(case3Ok ? "OK" : "FAIL", "Case3-imaginary-pair");
if (!case3Ok) {
  failed += 1;
}

const case4Basis: BasisToken[] = [
  { kind: "complex-cos", real: 0, imagAbs: 1, power: 0 },
  { kind: "complex-sin", real: 0, imagAbs: 1, power: 0 },
  { kind: "complex-cos", real: 0, imagAbs: 1, power: 1 },
  { kind: "complex-sin", real: 0, imagAbs: 1, power: 1 },
];
const case4Coeffs = [1, 2, 3, 4];
const case4Initial = applyInitialConditionMatrix(buildInitialConditionMatrix(case4Basis), case4Coeffs);
const case4Ok =
  numbersEqual(case4Initial[0], 1) &&
  numbersEqual(case4Initial[1], 5) &&
  numbersEqual(case4Initial[2], 7) &&
  numbersEqual(case4Initial[3], -11);
console.log(case4Ok ? "OK" : "FAIL", "Case4-repeated-imaginary");
if (!case4Ok) {
  failed += 1;
  console.log("  initial", case4Initial);
}

const case5Basis: BasisToken[] = [
  { kind: "real", real: -1, power: 0 },
  { kind: "complex-cos", real: 0, imagAbs: 1, power: 0 },
  { kind: "complex-sin", real: 0, imagAbs: 1, power: 0 },
];
const case5Coeffs = [1, 2, -1];
const case5Initial = applyInitialConditionMatrix(buildInitialConditionMatrix(case5Basis), case5Coeffs);
const case5Ok =
  numbersEqual(case5Initial[0], 3) &&
  numbersEqual(case5Initial[1], -2) &&
  numbersEqual(case5Initial[2], -1);
console.log(case5Ok ? "OK" : "FAIL", "Case5-mixed");
if (!case5Ok) {
  failed += 1;
}

const case6Ok =
  assertDerivative({ kind: "real", real: 1, power: 2 }, 0, 0, "x2exp-at-0") &&
  assertDerivative({ kind: "real", real: 1, power: 2 }, 1, 0, "x2exp-at-1") &&
  assertDerivative({ kind: "complex-sin", real: 0, imagAbs: 1, power: 2 }, 0, 0, "x2sin-at-0") &&
  assertDerivative({ kind: "complex-sin", real: 0, imagAbs: 1, power: 2 }, 1, 0, "x2sin-at-1");
console.log(case6Ok ? "OK" : "FAIL", "Case6-power-greater");
if (!case6Ok) {
  failed += 1;
}

const case7Ok =
  assertDerivative({ kind: "real", real: 0, power: 0 }, 0, 1, "one-at-0") &&
  assertDerivative({ kind: "real", real: 0, power: 0 }, 1, 0, "one-at-1") &&
  assertDerivative({ kind: "real", real: 0, power: 1 }, 0, 0, "x-at-0") &&
  assertDerivative({ kind: "real", real: 0, power: 1 }, 1, 1, "x-at-1");
console.log(case7Ok ? "OK" : "FAIL", "Case7-zero-rate");
if (!case7Ok) {
  failed += 1;
}

const evalOk = evaluateInitialCoefficientAnswer(["2", "-1"], [2, -1]).isCorrect;
console.log(evalOk ? "OK" : "FAIL", "eval-correct");
if (!evalOk) {
  failed += 1;
}

const evalWrong = evaluateInitialCoefficientAnswer(["2", "1"], [2, -1]);
console.log(!evalWrong.isCorrect && evalWrong.incorrectIndexes.includes(1) ? "OK" : "FAIL", "eval-partial");
if (evalWrong.isCorrect || !evalWrong.incorrectIndexes.includes(1)) {
  failed += 1;
}

const stableSeed = 104201;
const disabledQuestion = buildConstantCoefficientPracticeQuestion(3, "easy", stableSeed, {
  includeInitialConditions: false,
});
const enabledQuestion = buildConstantCoefficientPracticeQuestion(3, "easy", stableSeed, {
  includeInitialConditions: true,
});
const unchangedEquation =
  disabledQuestion.equationLatex === enabledQuestion.equationLatex &&
  disabledQuestion.seed === enabledQuestion.seed &&
  disabledQuestion.polynomialCoefficients.every((value, index) =>
    numbersEqual(value, enabledQuestion.polynomialCoefficients[index] ?? NaN),
  ) &&
  disabledQuestion.initialConditions === null &&
  enabledQuestion.initialConditions !== null;
console.log(unchangedEquation ? "OK" : "FAIL", "generation-unchanged-equation");
if (!unchangedEquation) {
  failed += 1;
  console.log("  disabled", disabledQuestion.equationLatex);
  console.log("  enabled", enabledQuestion.equationLatex);
}

const det = initialConditionMatrixDeterminant(buildInitialConditionMatrix(case4Basis));
console.log(Math.abs(det) > 1e-9 ? "OK" : "FAIL", "matrix-invertible", det);
if (Math.abs(det) <= 1e-9) {
  failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
