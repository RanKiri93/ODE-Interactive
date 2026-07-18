import {
  formatAffinePolynomialLatexFromCoefficients,
  formatPolynomialLatexFromCoefficients,
} from "../app/constant-coefficients-euler/math/algebraicFormatting";
import { formatConstantCoefficientEquation } from "../app/constant-coefficients-euler/math/polynomial";
import { formatAffineConstantCoefficientEquation } from "../app/constant-coefficients-euler/practice/reconstructionEvaluation";
import { evaluateNormalizedPolynomialAnswer } from "../app/constant-coefficients-euler/practice/polynomialEvaluation";

let failed = 0;

function assert(name: string, ok: boolean, actual?: string, expected?: string) {
  if (ok) {
    console.log("OK", name);
    return;
  }
  console.log("FAIL", name);
  if (actual !== undefined) {
    console.log("  actual  ", actual);
  }
  if (expected !== undefined) {
    console.log("  expected", expected);
  }
  failed += 1;
}

function forbiddenPatterns(value: string): boolean {
  return (
    !value.includes("1r^2") &&
    !value.includes("1y''") &&
    !value.includes("+(-") &&
    !value.includes("-(-") &&
    !value.includes("-0")
  );
}

const polyLeading = formatPolynomialLatexFromCoefficients([4, -4, 1], "r");
assert("poly-leading-unit-omitted", polyLeading === "r^2-4r+4", polyLeading, "r^2-4r+4");
assert(
  "poly-leading-unit-omitted-not-1r2",
  !formatPolynomialLatexFromCoefficients([4, -4, 1], "r").includes("1r^2"),
);
assert(
  "equation-leading-unit-omitted",
  formatConstantCoefficientEquation([4, -4, 1]) === "y''-4y'+4y=0",
);
assert(
  "equation-zero-linear",
  formatConstantCoefficientEquation([4, 0, 1]) === "y''+4y=0",
);
const polyZeroLinear = formatPolynomialLatexFromCoefficients([4, 0, 1], "r");
assert("poly-zero-linear", polyZeroLinear === "r^2+4", polyZeroLinear, "r^2+4");
const polyCoeffOne = formatPolynomialLatexFromCoefficients([1, 1, 1], "r");
assert("poly-coeff-one", polyCoeffOne === "r^2+r+1", polyCoeffOne, "r^2+r+1");
assert(
  "equation-coeff-one",
  formatConstantCoefficientEquation([1, 1, 1]) === "y''+y'+y=0",
);
const polyCoeffMinusOne = formatPolynomialLatexFromCoefficients([-1, -1, 1], "r");
assert("poly-coeff-minus-one", polyCoeffMinusOne === "r^2-r-1", polyCoeffMinusOne, "r^2-r-1");
assert(
  "equation-coeff-minus-one",
  formatConstantCoefficientEquation([-1, -1, 1]) === "y''-y'-y=0",
);

const affineFamily = [
  { constant: 0, lambda: -2 },
  { constant: 2, lambda: -1 },
  { constant: 1, lambda: 0 },
];
const affinePoly = formatAffinePolynomialLatexFromCoefficients(affineFamily, "r");
const affineEq = formatAffineConstantCoefficientEquation(affineFamily);

assert("affine-family-poly", affinePoly === "r^2+(2-\\lambda)r-2\\lambda", affinePoly, "r^2+(2-\\lambda)r-2\\lambda");
assert(
  "affine-family-equation",
  affineEq === "y''+(2-\\lambda)y'-2\\lambda y=0",
  affineEq,
  "y''+(2-\\lambda)y'-2\\lambda y=0",
);
assert("affine-family-no-double-neg", forbiddenPatterns(affinePoly) && forbiddenPatterns(affineEq));
assert("affine-family-no-1r2", !affinePoly.includes("1r^2") && !affineEq.includes("1y''"));

const normalizedEval = evaluateNormalizedPolynomialAnswer(["4", "-4"], [4, -4, 1]);
assert("normalized-eval-accepts-two-coefficients", normalizedEval.isCorrect === true);

const normalizedEvalWrong = evaluateNormalizedPolynomialAnswer(["4", "4"], [4, -4, 1]);
assert("normalized-eval-rejects-wrong", normalizedEvalWrong.isCorrect === false);

process.exit(failed > 0 ? 1 : 0);
