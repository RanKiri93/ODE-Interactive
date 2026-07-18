import {
  EPS,
  MAX_ABS_EULER_COEFFICIENT,
  MAX_EULER_COEFFICIENT_DIGITS,
  MAX_GENERATION_ATTEMPTS,
} from "../constants";
import { expectedBasisTokensFromGroups, formatBasisTokenPreview } from "../math/basis";
import { convertFallingToPower, convertPowerToFalling } from "../math/eulerConversion";
import {
  expandPolynomialFromGroups,
  formatEulerEquation,
  formatFactoredPolynomialLatex,
  formatPolynomialLatex,
  formatTransformedConstantCoefficientEquation,
} from "../math/polynomial";
import {
  assertCanonicalizationPreservesDegree,
  canonicalizeRootGroups,
} from "../math/rootCanonicalization";
import type { Difficulty, EulerTransformationPracticeQuestion, SolutionRootGroup } from "../types";
import { numbersEqual } from "../utils/formatting";
import { assertPolynomialIsMonic } from "./polynomialEvaluation";
import { generateRootGroups } from "./questionGeneration";
import { assertRootGroupsMatchDegree } from "./rootEvaluation";
import { mixSeed, SeededRandom } from "./random";

function coefficientDigitCount(value: number): number {
  return String(Math.abs(Math.round(value))).length;
}

function eulerCoefficientsAreReasonable(eulerCoefficients: number[]): boolean {
  const degree = eulerCoefficients.length - 1;
  const leading = eulerCoefficients[degree];
  if (leading === undefined || Math.abs(leading) < EPS) {
    return false;
  }

  for (const coefficient of eulerCoefficients) {
    if (Math.abs(coefficient) > MAX_ABS_EULER_COEFFICIENT) {
      return false;
    }
    if (coefficientDigitCount(coefficient) > MAX_EULER_COEFFICIENT_DIGITS) {
      return false;
    }
  }

  return true;
}

function assertEulerQuestionInvariants(
  question: Omit<EulerTransformationPracticeQuestion, "expectedBasisLatex" | "expectedEulerBasisLatex">,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  assertRootGroupsMatchDegree(question.roots, question.degree);
  assertPolynomialIsMonic(question.characteristicPolynomialCoefficients, question.degree);

  const roundTrip = convertFallingToPower(question.eulerCoefficients);
  for (let index = 0; index <= question.degree; index += 1) {
    const expected = question.characteristicPolynomialCoefficients[index] ?? 0;
    const actual = roundTrip[index] ?? 0;
    if (!numbersEqual(expected, actual)) {
      throw new Error(
        `Euler round-trip failed at index ${index}: expected ${expected}, got ${actual}.`,
      );
    }
  }

  if (question.expectedBasis.length !== question.degree) {
    throw new Error(
      `Expected basis length ${question.expectedBasis.length} does not match degree ${question.degree}.`,
    );
  }
}

function buildFromRootGroups(
  seed: number,
  degree: number,
  difficulty: Difficulty,
  rootGroups: SolutionRootGroup[],
): EulerTransformationPracticeQuestion {
  const canonicalRootGroups = canonicalizeRootGroups(rootGroups);
  assertCanonicalizationPreservesDegree(rootGroups, canonicalRootGroups);
  const characteristicPolynomialCoefficients = expandPolynomialFromGroups(canonicalRootGroups);
  const eulerCoefficients = convertPowerToFalling(characteristicPolynomialCoefficients);
  const expectedBasis = expectedBasisTokensFromGroups(canonicalRootGroups);

  const questionCore = {
    seed,
    degree,
    difficulty,
    eulerCoefficients,
    eulerEquationLatex: formatEulerEquation(eulerCoefficients),
    characteristicPolynomialCoefficients,
    characteristicPolynomialLatex: formatPolynomialLatex(characteristicPolynomialCoefficients, "r"),
    factoredPolynomialLatex: formatFactoredPolynomialLatex(canonicalRootGroups),
    constantCoefficientEquationLatex: formatTransformedConstantCoefficientEquation(
      characteristicPolynomialCoefficients,
    ),
    roots: canonicalRootGroups,
    expectedBasis,
  };

  assertEulerQuestionInvariants(questionCore);

  return {
    ...questionCore,
    expectedBasisLatex: expectedBasis.map((token) => formatBasisTokenPreview(token, "constant-t")),
    expectedEulerBasisLatex: expectedBasis.map((token) => formatBasisTokenPreview(token, "euler-x")),
  };
}

/** Deterministic fallback: x^2 y'' - 2 x y' + 2 y = 0 (Case 1 from spec). */
function fallbackEulerQuestion(seed: number, degree: number, difficulty: Difficulty): EulerTransformationPracticeQuestion {
  const rootGroups: SolutionRootGroup[] =
    degree === 2
      ? [
          { kind: "real", real: 1, multiplicity: 1 },
          { kind: "real", real: 2, multiplicity: 1 },
        ]
      : Array.from({ length: degree }, (_, index) => ({
          kind: "real" as const,
          real: index + 1,
          multiplicity: 1,
        }));

  return buildFromRootGroups(seed, degree, difficulty, rootGroups);
}

export function buildEulerTransformationPracticeQuestion(
  degree: number,
  difficulty: Difficulty,
  seed: number,
): EulerTransformationPracticeQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const attemptSeed = mixSeed(seed, 0xe01e0000 + attempt);
    const rng = new SeededRandom(mixSeed(attemptSeed, 0x104138));
    const rootGroups = generateRootGroups(degree, difficulty, rng);
    const characteristicPolynomialCoefficients = expandPolynomialFromGroups(rootGroups);
    const eulerCoefficients = convertPowerToFalling(characteristicPolynomialCoefficients);

    if (!eulerCoefficientsAreReasonable(eulerCoefficients)) {
      continue;
    }

    return buildFromRootGroups(attemptSeed, degree, difficulty, rootGroups);
  }

  return fallbackEulerQuestion(seed, degree, difficulty);
}
