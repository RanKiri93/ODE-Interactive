import { formatShiftedVariable } from "./algebraicFormatting";
import { formatNumber, normalizeNumber } from "../utils/formatting";

function formatMu(mu: number): string {
  return formatNumber(normalizeNumber(mu));
}

function formatNumericRootFactor(mu: number): string {
  const shifted = formatShiftedVariable("r", mu);
  return shifted === "r" ? "r" : `(${shifted})`;
}

export function formatTwoRealRootsFactoredPolynomialLatex(mu: number): string {
  const muTerm = formatNumericRootFactor(mu);
  return `p_{\\mathrm{real}}(r)=${muTerm}(r-\\lambda_1)(r-\\lambda_2)`;
}

export function formatTwoRealRootsExpandedPolynomialLatex(mu: number): string {
  if (Math.abs(normalizeNumber(mu)) < 1e-9) {
    return "p_{\\mathrm{real}}(r)=r^3-(\\lambda_1+\\lambda_2)r^2+\\lambda_1\\lambda_2r";
  }
  const muLatex = formatMu(mu);
  return (
    `p_{\\mathrm{real}}(r)=r^3-(${muLatex}+\\lambda_1+\\lambda_2)r^2+` +
    `(${muLatex}\\lambda_1+${muLatex}\\lambda_2+\\lambda_1\\lambda_2)r-${muLatex}\\lambda_1\\lambda_2`
  );
}

export function formatTwoRealRootsEquationFamilyLatex(mu: number): string {
  if (Math.abs(normalizeNumber(mu)) < 1e-9) {
    return "y'''-(\\lambda_1+\\lambda_2)y''+(\\lambda_1\\lambda_2)y'=0";
  }
  const muLatex = formatMu(mu);
  return (
    `y'''-(${muLatex}+\\lambda_1+\\lambda_2)y''+` +
    `(${muLatex}\\lambda_1+${muLatex}\\lambda_2+\\lambda_1\\lambda_2)y'-${muLatex}\\lambda_1\\lambda_2y=0`
  );
}

export function formatComplexPairFactoredPolynomialLatex(mu: number): string {
  const muTerm = formatNumericRootFactor(mu);
  return `p_{\\mathrm{complex}}(r)=${muTerm}\\left((r-\\alpha)^2+\\beta^2\\right),\\quad\\beta\\ne0`;
}

export function formatComplexPairExpandedPolynomialLatex(mu: number): string {
  if (Math.abs(normalizeNumber(mu)) < 1e-9) {
    return "p_{\\mathrm{complex}}(r)=r^3-2\\alpha r^2+(\\alpha^2+\\beta^2)r";
  }
  const muLatex = formatMu(mu);
  return (
    `p_{\\mathrm{complex}}(r)=r^3-(${muLatex}+2\\alpha)r^2+` +
    `(2\\alpha\\cdot${muLatex}+\\alpha^2+\\beta^2)r-${muLatex}(\\alpha^2+\\beta^2)`
  );
}

export function formatComplexPairEquationFamilyLatex(mu: number): string {
  if (Math.abs(normalizeNumber(mu)) < 1e-9) {
    return "y'''-2\\alpha y''+(\\alpha^2+\\beta^2)y'=0";
  }
  const muLatex = formatMu(mu);
  return (
    `y'''-(${muLatex}+2\\alpha)y''+` +
    `(2\\alpha\\cdot${muLatex}+\\alpha^2+\\beta^2)y'-${muLatex}(\\alpha^2+\\beta^2)y=0`
  );
}
