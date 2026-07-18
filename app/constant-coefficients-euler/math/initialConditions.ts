import { EPS } from "../constants";
import { basisTokenDerivativeAtZero } from "./basisDerivatives";
import type { BasisToken } from "../types";
import { normalizeNumber } from "../utils/formatting";

export function buildInitialConditionMatrix(basis: readonly BasisToken[]): number[][] {
  const size = basis.length;
  return Array.from({ length: size }, (_, derivativeOrder) =>
    basis.map((token) => basisTokenDerivativeAtZero(token, derivativeOrder)),
  );
}

export function applyInitialConditionMatrix(matrix: readonly number[][], coefficients: readonly number[]): number[] {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  if (rows === 0 || cols === 0) {
    return [];
  }

  if (coefficients.length !== cols) {
    throw new Error(
      `Coefficient vector length ${coefficients.length} does not match matrix column count ${cols}.`,
    );
  }

  return matrix.map((row) => {
    if (row.length !== cols) {
      throw new Error("Initial-condition matrix rows must have equal length.");
    }

    let sum = 0;
    for (let index = 0; index < cols; index += 1) {
      sum += (row[index] ?? 0) * (coefficients[index] ?? 0);
    }
    return normalizeNumber(sum);
  });
}

function determinant2(matrix: number[][]): number {
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

function determinant3(matrix: number[][]): number {
  const [
    [a, b, c],
    [d, e, f],
    [g, h, i],
  ] = matrix;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function determinant4(matrix: number[][]): number {
  let det = 0;
  for (let column = 0; column < 4; column += 1) {
    const minorRows = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
    const sign = column % 2 === 0 ? 1 : -1;
    det += sign * (matrix[0][column] ?? 0) * determinant3(minorRows);
  }
  return det;
}

export function initialConditionMatrixDeterminant(matrix: readonly number[][]): number {
  const size = matrix.length;
  if (size === 0) {
    return 0;
  }

  if (matrix.some((row) => row.length !== size)) {
    throw new Error("Initial-condition matrix must be square.");
  }

  if (size === 1) {
    return matrix[0][0] ?? 0;
  }
  if (size === 2) {
    return determinant2(matrix as number[][]);
  }
  if (size === 3) {
    return determinant3(matrix as number[][]);
  }
  if (size === 4) {
    return determinant4(matrix as number[][]);
  }

  throw new Error(`Determinant is implemented only for matrix sizes up to 4, got ${size}.`);
}

export function assertInitialConditionMatrixInvertible(matrix: readonly number[][]): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const determinant = initialConditionMatrixDeterminant(matrix);
  if (Math.abs(determinant) < EPS) {
    throw new Error("Initial-condition matrix is not invertible.");
  }
}

export function formatDerivativeAtZeroLabel(order: number): string {
  if (order === 0) {
    return "y(0)";
  }
  if (order === 1) {
    return "y'(0)";
  }
  if (order === 2) {
    return "y''(0)";
  }
  if (order === 3) {
    return "y'''(0)";
  }
  return `y^{(${order})}(0)`;
}

export function formatInitialConditionSystemLatex(
  matrix: readonly number[][],
  initialValues: readonly number[],
): string[] {
  const size = matrix.length;
  const equations: string[] = [];

  for (let row = 0; row < size; row += 1) {
    const terms: string[] = [];
    for (let column = 0; column < size; column += 1) {
      const coefficient = matrix[row]?.[column] ?? 0;
      if (Math.abs(coefficient) < EPS) {
        continue;
      }

      const sign = coefficient < 0 ? "-" : terms.length === 0 ? "" : "+";
      const absolute = Math.abs(normalizeNumber(coefficient));
      const body = Math.abs(absolute - 1) < EPS ? `c_{${column + 1}}` : `${absolute}c_{${column + 1}}`;
      terms.push(`${sign}${body}`);
    }

    const lhs = terms.length > 0 ? terms.join("") : "0";
    const rhs = normalizeNumber(initialValues[row] ?? 0);
    equations.push(`${lhs}=${rhs}`);
  }

  return equations;
}
