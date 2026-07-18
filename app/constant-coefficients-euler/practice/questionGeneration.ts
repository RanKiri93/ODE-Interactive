import {
  COMPLEX_POOL_HARD,
  COMPLEX_POOL_MEDIUM,
  DEFAULT_REAL_ROOTS,
  EASY_REAL_ROOTS,
} from "../constants";
import { convertPowerToFalling } from "../math/eulerConversion";
import {
  expectedBasisTokensFromGroups,
  formatBasisTokenPreview,
} from "../math/basis";
import {
  expandPolynomialFromGroups,
  formatConstantCoefficientEquation,
  formatEulerEquation,
  formatFactoredPolynomialLatex,
  formatPolynomialLatex,
} from "../math/polynomial";
import {
  assertCanonicalizationPreservesDegree,
  canonicalizeRootGroups,
} from "../math/rootCanonicalization";
import type {
  ConstantCoefficientPracticeQuestion,
  Difficulty,
  EquationKind,
  GeneratedEquationQuestion,
  RandomSource,
  SolutionRootGroup,
} from "../types";
import { assertPolynomialIsMonic } from "./polynomialEvaluation";
import { assertRootGroupsMatchDegree } from "./rootEvaluation";
import { mixSeed, SeededRandom } from "./random";
import { generateInitialConditionData } from "./initialConditionGeneration";
import { EPS, MAX_GENERATION_ATTEMPTS, MAX_INITIAL_CONDITION_DEGREE } from "../constants";
import { buildInitialConditionMatrix, initialConditionMatrixDeterminant } from "../math/initialConditions";

function generateRootGroups(degree: number, difficulty: Difficulty, rng: RandomSource): SolutionRootGroup[] {
  const groups: SolutionRootGroup[] = [];
  let remaining = degree;

  while (remaining > 0) {
    const existingComplex = groups.filter((group) => group.kind === "complex").length;
    const canUseComplex =
      difficulty !== "easy" && remaining >= 2 && (difficulty === "hard" || existingComplex === 0);
    const useComplex = canUseComplex && rng.next() < (difficulty === "hard" ? 0.45 : 0.35);

    if (useComplex) {
      const pair = rng.pick(difficulty === "hard" ? COMPLEX_POOL_HARD : COMPLEX_POOL_MEDIUM);
      const maxMultiplicity = difficulty === "hard" ? Math.min(2, Math.floor(remaining / 2)) : 1;
      const multiplicity = rng.integer(1, maxMultiplicity);
      groups.push({ kind: "complex", real: pair.real, imagAbs: pair.imagAbs, multiplicity });
      remaining -= 2 * multiplicity;
      continue;
    }

    const pool = difficulty === "easy" ? EASY_REAL_ROOTS : DEFAULT_REAL_ROOTS;
    const real = rng.pick(pool);
    const maxMultiplicity =
      difficulty === "easy" ? 1 : difficulty === "medium" ? Math.min(2, remaining) : Math.min(3, remaining);
    const multiplicity = rng.integer(1, maxMultiplicity);
    groups.push({ kind: "real", real, multiplicity });
    remaining -= multiplicity;
  }

  return groups;
}

export { generateRootGroups };

export function buildEquationQuestion(
  equationKind: EquationKind,
  degree: number,
  difficulty: Difficulty,
  seed: number,
): GeneratedEquationQuestion {
  const rng = new SeededRandom(mixSeed(seed, 0x104137));
  const generatedRootGroups = generateRootGroups(degree, difficulty, rng);
  const rootGroups = canonicalizeRootGroups(generatedRootGroups);
  assertCanonicalizationPreservesDegree(generatedRootGroups, rootGroups);
  const characteristicPolynomial = expandPolynomialFromGroups(rootGroups);
  const eulerCoefficients = convertPowerToFalling(characteristicPolynomial);
  const polynomialLatex = formatPolynomialLatex(characteristicPolynomial, "r");
  const equationLatex =
    equationKind === "constant-coefficients"
      ? formatConstantCoefficientEquation(characteristicPolynomial)
      : formatEulerEquation(eulerCoefficients);
  const expectedBasisTokens = expectedBasisTokensFromGroups(rootGroups);
  const expectedBasisLatex = expectedBasisTokens.map((token) => formatBasisTokenPreview(token, equationKind));

  return {
    seed,
    degree,
    difficulty,
    equationKind,
    rootGroups,
    characteristicPolynomial,
    eulerCoefficients,
    equationLatex,
    polynomialLatex,
    expectedBasisTokens,
    expectedBasisLatex,
  };
}

export function buildConstantCoefficientPracticeQuestion(
  degree: number,
  difficulty: Difficulty,
  seed: number,
  options: { includeInitialConditions?: boolean } = {},
): ConstantCoefficientPracticeQuestion {
  const includeInitialConditions =
    Boolean(options.includeInitialConditions) && degree <= MAX_INITIAL_CONDITION_DEGREE;

  if (!includeInitialConditions) {
    const generated = buildEquationQuestion("constant-coefficients", degree, difficulty, seed);
    assertRootGroupsMatchDegree(generated.rootGroups, degree);
    assertPolynomialIsMonic(generated.characteristicPolynomial, degree);

    return {
      seed: generated.seed,
      degree: generated.degree,
      difficulty: generated.difficulty,
      equationLatex: generated.equationLatex,
      polynomialCoefficients: generated.characteristicPolynomial,
      polynomialLatex: generated.polynomialLatex,
      factoredPolynomialLatex: formatFactoredPolynomialLatex(generated.rootGroups),
      roots: generated.rootGroups,
      expectedBasis: generated.expectedBasisTokens,
      expectedBasisLatex: generated.expectedBasisLatex,
      initialConditions: null,
    };
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const attemptSeed = seed + attempt;
    const generated = buildEquationQuestion("constant-coefficients", degree, difficulty, attemptSeed);
    assertRootGroupsMatchDegree(generated.rootGroups, degree);
    assertPolynomialIsMonic(generated.characteristicPolynomial, degree);

    const matrix = buildInitialConditionMatrix(generated.expectedBasisTokens);
    if (Math.abs(initialConditionMatrixDeterminant(matrix)) < EPS) {
      continue;
    }

    return {
      seed: generated.seed,
      degree: generated.degree,
      difficulty: generated.difficulty,
      equationLatex: generated.equationLatex,
      polynomialCoefficients: generated.characteristicPolynomial,
      polynomialLatex: generated.polynomialLatex,
      factoredPolynomialLatex: formatFactoredPolynomialLatex(generated.rootGroups),
      roots: generated.rootGroups,
      expectedBasis: generated.expectedBasisTokens,
      expectedBasisLatex: generated.expectedBasisLatex,
      initialConditions: generateInitialConditionData(
        generated.expectedBasisTokens,
        difficulty,
        attemptSeed,
      ),
    };
  }

  const generated = buildEquationQuestion("constant-coefficients", degree, difficulty, seed);
  assertRootGroupsMatchDegree(generated.rootGroups, degree);
  assertPolynomialIsMonic(generated.characteristicPolynomial, degree);

  return {
    seed: generated.seed,
    degree: generated.degree,
    difficulty: generated.difficulty,
    equationLatex: generated.equationLatex,
    polynomialCoefficients: generated.characteristicPolynomial,
    polynomialLatex: generated.polynomialLatex,
    factoredPolynomialLatex: formatFactoredPolynomialLatex(generated.rootGroups),
    roots: generated.rootGroups,
    expectedBasis: generated.expectedBasisTokens,
    expectedBasisLatex: generated.expectedBasisLatex,
    initialConditions: null,
  };
}

export function generateConstantCoefficientPracticeQuestion({
  seed,
  degree,
  difficulty,
}: {
  seed: number;
  degree: number;
  difficulty: Difficulty;
}): ConstantCoefficientPracticeQuestion {
  return buildConstantCoefficientPracticeQuestion(degree, difficulty, seed);
}

export function generateEquationQuestion({
  seed,
  degree,
  difficulty,
  equationKind,
}: {
  seed: number;
  degree: number;
  difficulty: Difficulty;
  equationKind: EquationKind;
}): GeneratedEquationQuestion {
  return buildEquationQuestion(equationKind, degree, difficulty, seed);
}
