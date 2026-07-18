import {
  DEFAULT_INITIAL_COEFFICIENT_POOL,
  EASY_INITIAL_COEFFICIENT_POOL,
  MAX_ABS_INITIAL_VALUE,
  MAX_INITIAL_GENERATION_ATTEMPTS,
} from "../constants";
import {
  applyInitialConditionMatrix,
  assertInitialConditionMatrixInvertible,
  buildInitialConditionMatrix,
} from "../math/initialConditions";
import type { BasisToken, Difficulty, InitialConditionData } from "../types";
import { mixSeed, SeededRandom } from "./random";

function countNonzero(values: readonly number[]): number {
  return values.filter((value) => value !== 0).length;
}

function coefficientVectorMeetsDifficulty(values: readonly number[], difficulty: Difficulty): boolean {
  const nonzero = countNonzero(values);
  if (nonzero === 0) {
    return false;
  }
  if (difficulty === "easy") {
    return nonzero >= 1;
  }
  if (difficulty === "medium") {
    return nonzero >= 2;
  }
  return true;
}

function initialValuesAreValid(initialValues: readonly number[]): boolean {
  if (initialValues.length === 0) {
    return false;
  }
  if (initialValues.every((value) => Math.abs(value) < 1e-12)) {
    return false;
  }
  return initialValues.every(
    (value) => Number.isFinite(value) && Math.abs(value) <= MAX_ABS_INITIAL_VALUE,
  );
}

function pickCoefficientVector(
  size: number,
  difficulty: Difficulty,
  rng: SeededRandom,
): number[] {
  const pool =
    difficulty === "easy" ? EASY_INITIAL_COEFFICIENT_POOL : DEFAULT_INITIAL_COEFFICIENT_POOL;

  const values = Array.from({ length: size }, () => rng.pick(pool));
  if (coefficientVectorMeetsDifficulty(values, difficulty)) {
    return values;
  }

  if (difficulty === "medium" && size >= 2) {
    const adjusted = [...values];
    adjusted[0] = rng.pick(pool.filter((value) => value !== 0));
    adjusted[1] = rng.pick(pool.filter((value) => value !== 0));
    return adjusted;
  }

  if (difficulty === "easy") {
    const adjusted = [...values];
    adjusted[rng.integer(0, size - 1)] = rng.pick(pool.filter((value) => value !== 0));
    return adjusted;
  }

  return values.map((value, index) => (index === 0 && value === 0 ? 1 : value));
}

function fallbackCoefficientVector(size: number): number[] {
  const values = Array.from({ length: size }, () => 0);
  values[0] = 1;
  if (size > 1) {
    values[1] = 1;
  }
  return values;
}

export function generateInitialConditionData(
  orderedBasis: BasisToken[],
  difficulty: Difficulty,
  seed: number,
): InitialConditionData {
  const derivativeMatrix = buildInitialConditionMatrix(orderedBasis);
  assertInitialConditionMatrixInvertible(derivativeMatrix);

  for (let attempt = 0; attempt < MAX_INITIAL_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = new SeededRandom(mixSeed(seed, 0x1c000000 + attempt));
    const expectedCoefficients = pickCoefficientVector(orderedBasis.length, difficulty, rng);
    if (!coefficientVectorMeetsDifficulty(expectedCoefficients, difficulty)) {
      continue;
    }

    const initialValues = applyInitialConditionMatrix(derivativeMatrix, expectedCoefficients);
    if (!initialValuesAreValid(initialValues)) {
      continue;
    }

    return {
      orderedBasis: [...orderedBasis],
      expectedCoefficients,
      derivativeMatrix,
      initialValues,
    };
  }

  const expectedCoefficients = fallbackCoefficientVector(orderedBasis.length);
  const initialValues = applyInitialConditionMatrix(derivativeMatrix, expectedCoefficients);

  return {
    orderedBasis: [...orderedBasis],
    expectedCoefficients,
    derivativeMatrix,
    initialValues,
  };
}
