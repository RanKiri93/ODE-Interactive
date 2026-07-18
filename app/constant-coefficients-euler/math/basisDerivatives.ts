import { EPS } from "../constants";
import type { BasisToken } from "../types";
import { normalizeNumber } from "../utils/formatting";

type ComplexNumber = {
  real: number;
  imag: number;
};

function complex(real: number, imag: number): ComplexNumber {
  return { real: normalizeNumber(real), imag: normalizeNumber(imag) };
}

function complexMultiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return complex(a.real * b.real - a.imag * b.imag, a.real * b.imag + a.imag * b.real);
}

function complexPower(base: ComplexNumber, exponent: number): ComplexNumber {
  if (exponent === 0) {
    return complex(1, 0);
  }
  if (exponent < 0) {
    throw new Error("Negative complex exponent is not supported.");
  }

  let result = complex(1, 0);
  let factor = base;
  let power = exponent;

  while (power > 0) {
    if (power % 2 === 1) {
      result = complexMultiply(result, factor);
    }
    factor = complexMultiply(factor, factor);
    power = Math.floor(power / 2);
  }

  return result;
}

function integerPower(base: number, exponent: number): number {
  if (exponent === 0) {
    return 1;
  }
  if (exponent < 0) {
    throw new Error("Negative integer exponent is not supported.");
  }

  let result = 1;
  let factor = base;
  let power = exponent;

  while (power > 0) {
    if (power % 2 === 1) {
      result *= factor;
    }
    factor *= factor;
    power = Math.floor(power / 2);
  }

  return normalizeNumber(result);
}

function factorial(value: number): number {
  let result = 1;
  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }
  return result;
}

function factorialRatio(derivativeOrder: number, polynomialPower: number): number {
  if (derivativeOrder < polynomialPower) {
    return 0;
  }

  return factorial(derivativeOrder) / factorial(derivativeOrder - polynomialPower);
}

function realTokenDerivativeAtZero(real: number, polynomialPower: number, derivativeOrder: number): number {
  if (derivativeOrder < polynomialPower) {
    return 0;
  }

  const ratio = factorialRatio(derivativeOrder, polynomialPower);
  const exponent = derivativeOrder - polynomialPower;
  return normalizeNumber(ratio * integerPower(real, exponent));
}

function complexTokenDerivativeAtZero(
  real: number,
  imagAbs: number,
  polynomialPower: number,
  derivativeOrder: number,
  component: "real" | "imag",
): number {
  if (derivativeOrder < polynomialPower) {
    return 0;
  }

  const ratio = factorialRatio(derivativeOrder, polynomialPower);
  const exponent = derivativeOrder - polynomialPower;
  const power = complexPower(complex(real, imagAbs), exponent);
  const scaled = component === "real" ? power.real : power.imag;
  return normalizeNumber(ratio * scaled);
}

export function basisTokenDerivativeAtZero(token: BasisToken, derivativeOrder: number): number {
  if (!Number.isFinite(derivativeOrder) || derivativeOrder < 0) {
    throw new Error("Derivative order must be a nonnegative integer.");
  }

  if (token.kind === "real") {
    return realTokenDerivativeAtZero(token.real, token.power, derivativeOrder);
  }

  if (token.kind === "complex-cos") {
    return complexTokenDerivativeAtZero(
      token.real,
      token.imagAbs,
      token.power,
      derivativeOrder,
      "real",
    );
  }

  return complexTokenDerivativeAtZero(
    token.real,
    token.imagAbs,
    token.power,
    derivativeOrder,
    "imag",
  );
}

export function assertBasisDerivativeFinite(token: BasisToken, derivativeOrder: number): number {
  const value = basisTokenDerivativeAtZero(token, derivativeOrder);
  if (!Number.isFinite(value)) {
    throw new Error("Nonfinite derivative value encountered.");
  }
  if (Math.abs(value) < EPS) {
    return 0;
  }
  return value;
}
