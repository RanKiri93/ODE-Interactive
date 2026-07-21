import { equationDomainLatex } from "../app/constant-coefficients-euler/constants";
import {
  deriveComplexPairDomain,
  deriveRealPairDomain,
  deriveTwoParameterDomains,
  twoParameterDomainsAreAdmissible,
} from "../app/constant-coefficients-euler/math/parameterDomains";
import { analyzeReconstruction } from "../app/constant-coefficients-euler/math/reconstruction";
import {
  formatComplexPairEquationFamilyLatex,
  formatComplexPairExpandedPolynomialLatex,
  formatComplexPairFactoredPolynomialLatex,
  formatTwoRealRootsEquationFamilyLatex,
  formatTwoRealRootsExpandedPolynomialLatex,
} from "../app/constant-coefficients-euler/math/twoParameterFormatting";
import {
  expandPolynomialFromGroups,
  formatConstantCoefficientEquation,
  quadraticPoly,
} from "../app/constant-coefficients-euler/math/polynomial";
import { collectSolutionRootGroups } from "../app/constant-coefficients-euler/math/roots";
import { evaluateComplexPairDomainAnswer } from "../app/constant-coefficients-euler/practice/reconstructionEvaluation";
import { buildReconstructionQuestion } from "../app/constant-coefficients-euler/practice/reconstructionQuestionGeneration";
import {
  verifyAllOrder3Templates,
  verifyInstantiatedOrder3Template,
} from "../app/constant-coefficients-euler/practice/reconstruction/order3Generation";
import {
  ORDER3_RECONSTRUCTION_TEMPLATES,
  getOrder3TemplateById,
} from "../app/constant-coefficients-euler/practice/reconstruction/templates/order3";
import { realRoot } from "../app/constant-coefficients-euler/practice/reconstruction/templates/shared";
import type {
  LambdaConstraint,
  RealPairDomain,
  ReconstructionImpossibleReason,
} from "../app/constant-coefficients-euler/types";
import { numbersEqual } from "../app/constant-coefficients-euler/utils/formatting";

let failed = 0;

function assert(name: string, ok: boolean) {
  console.log(ok ? "OK" : "FAIL", name);
  if (!ok) {
    failed += 1;
  }
}

for (const result of verifyAllOrder3Templates()) {
  assert(`template-${result.templateId}`, result.ok);
  if (!result.ok && result.reason) {
    console.log("  ", result.reason);
  }
}

const manualCases: Array<{
  name: string;
  templateId: string;
  params: Record<string, number | boolean>;
  expectedKind: "unique" | "one-real-parameter" | "two-parameter" | "impossible";
  expectedLambda?: LambdaConstraint;
  expectedRealPair?: RealPairDomain;
  expectedReason?: ReconstructionImpossibleReason;
  expectedPoly?: number[];
}> = [
  {
    name: "CaseA-three-real-roots",
    templateId: "O3-U01-easy",
    params: { realRootA: 1, realRootB: 2, realRootC: -1 },
    expectedKind: "unique",
    expectedPoly: [2, -1, -2, 1],
  },
  {
    name: "CaseB-repeated-and-simple",
    templateId: "O3-U02-easy",
    params: { realRootA: 2, realRootB: -1, shift: 0 },
    expectedKind: "unique",
  },
  {
    name: "CaseC-triple-root",
    templateId: "O3-U03",
    params: { realRootA: -1, shift: -2, constantTerm: 3 },
    expectedKind: "unique",
    expectedPoly: [1, 3, 3, 1],
  },
  {
    name: "CaseD-real-plus-complex",
    templateId: "O3-U04-easy",
    params: { realRootA: 2, complexRealPart: -1, frequency: 3, useCosine: true },
    expectedKind: "unique",
  },
  {
    name: "CaseE-one-parameter-real-pair",
    templateId: "O3-P01-easy",
    params: { realRootA: 1, realRootB: -2 },
    expectedKind: "one-real-parameter",
    expectedLambda: "all-real",
  },
  {
    name: "CaseF-one-parameter-complex",
    templateId: "O3-P03",
    params: { complexRealPart: -1, frequency: 2, useCosine: true },
    expectedKind: "one-real-parameter",
    expectedLambda: "all-real",
  },
  {
    name: "CaseG-two-parameter-none",
    templateId: "O3-T01-easy",
    params: { realRootA: 2 },
    expectedKind: "two-parameter",
    expectedRealPair: "all-real-pairs",
  },
  {
    name: "CaseH-two-parameter-bounded-plus",
    templateId: "O3-T01-bounded-plus",
    params: { realRootA: -1 },
    expectedKind: "two-parameter",
    expectedRealPair: "non-positive-not-both-zero",
  },
  {
    name: "CaseI-two-parameter-zero-collision",
    templateId: "O3-T01-zero-plus",
    params: { realRootA: 0 },
    expectedKind: "two-parameter",
    expectedRealPair: "strictly-negative",
  },
  {
    name: "CaseI2-two-parameter-zero-bounded-minus",
    templateId: "O3-T01-zero-minus",
    params: { realRootA: 0 },
    expectedKind: "two-parameter",
    expectedRealPair: "strictly-positive",
  },
  {
    name: "CaseJ-degree-contradiction",
    templateId: "O3-I07",
    params: { realRootA: 1 },
    expectedKind: "impossible",
    expectedReason: "forced-degree-exceeds-order",
  },
  {
    name: "CaseK-behavior-contradiction",
    templateId: "O3-I14",
    params: { frequency: 1, useCosine: true },
    expectedKind: "impossible",
    expectedReason: "given-solution-does-not-decay-plus-infinity",
  },
];

for (const testCase of manualCases) {
  const template = getOrder3TemplateById(testCase.templateId);
  assert(`${testCase.name}-template-exists`, template !== undefined);
  if (!template) {
    continue;
  }
  const verification = verifyInstantiatedOrder3Template(template, testCase.params, 1);
  assert(`${testCase.name}-instantiation`, verification.ok);
  const expressions = template.givenSolutions(testCase.params);
  const behavior = template.behaviorCondition(testCase.params);
  const analysis = analyzeReconstruction({
    equationKind: "constant-coefficients",
    order: 3,
    givenSolutions: expressions.flatMap((expression) =>
      expression.kind === "basis-token"
        ? [expression.token]
        : expression.terms.map((term) => term.token),
    ),
    behaviorCondition: behavior,
  });
  assert(`${testCase.name}-kind`, analysis.kind === testCase.expectedKind);
  if (testCase.expectedPoly && analysis.kind === "unique") {
    assert(
      `${testCase.name}-poly`,
      analysis.polynomialCoefficients.every((value, index) =>
        numbersEqual(value, testCase.expectedPoly![index] ?? 0),
      ),
    );
  }
  if (testCase.expectedLambda && analysis.kind === "one-real-parameter") {
    assert(`${testCase.name}-lambda`, analysis.lambdaConstraint === testCase.expectedLambda);
  }
  if (testCase.expectedRealPair && analysis.kind === "two-parameter") {
    assert(`${testCase.name}-real-pair`, analysis.realPairDomain === testCase.expectedRealPair);
    assert(
      `${testCase.name}-complex-beta-nonzero`,
      analysis.complexPairDomain.betaConstraint === "nonzero",
    );
    assert(
      `${testCase.name}-both-branches-admissible`,
      twoParameterDomainsAreAdmissible({
        realPairDomain: analysis.realPairDomain,
        complexPairDomain: analysis.complexPairDomain,
      }),
    );
  }
  if (testCase.templateId === "O3-T01-zero-minus" && analysis.kind === "two-parameter") {
    assert(`${testCase.name}-complex-alpha`, analysis.complexPairDomain.alphaConstraint === "non-negative");
    assert(`${testCase.name}-complex-beta`, analysis.complexPairDomain.betaConstraint === "nonzero");
    const realExpanded = formatTwoRealRootsExpandedPolynomialLatex(0);
    const realEquation = formatTwoRealRootsEquationFamilyLatex(0);
    const complexExpanded = formatComplexPairExpandedPolynomialLatex(0);
    const complexEquation = formatComplexPairEquationFamilyLatex(0);
    assert(`${testCase.name}-no-zero-constant-real`, !realExpanded.includes("-0"));
    assert(`${testCase.name}-no-zero-constant-eq`, !realEquation.includes("-0"));
    assert(`${testCase.name}-no-zero-constant-complex`, !complexExpanded.includes("-0"));
    assert(`${testCase.name}-no-zero-constant-complex-eq`, !complexEquation.includes("-0"));
  }
  if (testCase.expectedReason && analysis.kind === "impossible") {
    assert(`${testCase.name}-reason`, analysis.reason === testCase.expectedReason);
  }
}

assert(
  "real-pair-no-behavior",
  deriveRealPairDomain([realRoot(2, 1)], "none") === "all-real-pairs",
);
assert(
  "real-pair-bounded-plus-negative-mu",
  deriveRealPairDomain([realRoot(-1, 1)], "bounded-plus-infinity") ===
    "non-positive-not-both-zero",
);
assert(
  "real-pair-bounded-plus-zero-mu",
  deriveRealPairDomain([realRoot(0, 1)], "bounded-plus-infinity") === "strictly-negative",
);
assert(
  "complex-pair-decay-plus",
  deriveComplexPairDomain([realRoot(-2, 1)], "decay-plus-infinity").alphaConstraint === "negative",
);

assert(
  "domain-header-constant-coefficients",
  equationDomainLatex("constant-coefficients") === "\\mathbb R",
);
assert("domain-header-euler", equationDomainLatex("euler") === "x>0");

const behaviorConditions = [
  "none",
  "bounded-plus-infinity",
  "decay-plus-infinity",
  "bounded-minus-infinity",
  "decay-minus-infinity",
] as const;

for (const behavior of behaviorConditions) {
  const forcedRoots = [realRoot(0, 1)];
  const domains = deriveTwoParameterDomains(forcedRoots, behavior);
  assert(`two-param-both-branches-${behavior}`, twoParameterDomainsAreAdmissible(domains));
  assert(
    `complex-pair-beta-nonzero-${behavior}`,
    domains.complexPairDomain.betaConstraint === "nonzero",
  );
}

const betaSignDraft = (imag: string) => [{ id: "beta-sign", real: "1", imag, multiplicity: "1" }];
const betaPositiveGroups = collectSolutionRootGroups(betaSignDraft("2"));
const betaNegativeGroups = collectSolutionRootGroups(betaSignDraft("-2"));
assert("beta-sign-root-groups", JSON.stringify(betaPositiveGroups) === JSON.stringify(betaNegativeGroups));

const betaPositivePoly = expandPolynomialFromGroups(betaPositiveGroups ?? []);
const betaNegativePoly = expandPolynomialFromGroups(betaNegativeGroups ?? []);
assert(
  "beta-sign-polynomial",
  betaPositivePoly.every((value, index) => numbersEqual(value, betaNegativePoly[index] ?? 0)),
);

const betaPositiveEquation = formatConstantCoefficientEquation(
  expandPolynomialFromGroups([
    { kind: "real", real: 0, multiplicity: 1 },
    { kind: "complex", real: 1, imagAbs: 2, multiplicity: 1 },
  ]),
);
const betaNegativeEquation = formatConstantCoefficientEquation(
  expandPolynomialFromGroups([
    { kind: "real", real: 0, multiplicity: 1 },
    { kind: "complex", real: 1, imagAbs: 2, multiplicity: 1 },
  ]),
);
assert("beta-sign-equation", betaPositiveEquation === betaNegativeEquation);

assert(
  "beta-quadratic-invariant",
  quadraticPoly(1, 2).every((value, index) => numbersEqual(value, quadraticPoly(1, -2)[index] ?? 0)),
);

const expectedComplexDomain = deriveComplexPairDomain([realRoot(0, 1)], "bounded-minus-infinity");
assert(
  "beta-domain-answer-nonzero",
  evaluateComplexPairDomainAnswer(
    { alphaConstraint: "non-negative", betaConstraint: "nonzero" },
    expectedComplexDomain,
  ).isCorrect,
);
assert(
  "beta-domain-reject-positive",
  !evaluateComplexPairDomainAnswer(
    { alphaConstraint: "non-negative", betaConstraint: "positive" },
    expectedComplexDomain,
  ).isCorrect,
);
assert(
  "beta-domain-reject-zero",
  !evaluateComplexPairDomainAnswer(
    { alphaConstraint: "non-negative", betaConstraint: "all-real" },
    expectedComplexDomain,
  ).isCorrect,
);

assert(
  "complex-factored-format-beta-nonzero",
  formatComplexPairFactoredPolynomialLatex(0).includes("\\beta\\ne0"),
);
assert(
  "complex-factored-format-no-beta-positive",
  !formatComplexPairFactoredPolynomialLatex(0).includes("\\beta>0"),
);

for (const template of ORDER3_RECONSTRUCTION_TEMPLATES.filter(
  (entry) => entry.outcome === "feasible-two-parameter",
)) {
  assert(`template-${template.id}-declares-complex-domain`, template.expectedComplexPairDomain !== undefined);
}

const deterministic = buildReconstructionQuestion({
  seed: 104141,
  equationKind: "constant-coefficients",
  order: 3,
  difficulty: "medium",
  caseFilter: "mixed",
});
const deterministicRepeat = buildReconstructionQuestion({
  seed: 104141,
  equationKind: "constant-coefficients",
  order: 3,
  difficulty: "medium",
  caseFilter: "mixed",
});
assert("deterministic-template-id", deterministic.templateId === deterministicRepeat.templateId);
assert(
  "deterministic-given-solutions",
  JSON.stringify(deterministic.givenSolutionExpressions) ===
    JSON.stringify(deterministicRepeat.givenSolutionExpressions),
);

assert("catalog-nonempty", ORDER3_RECONSTRUCTION_TEMPLATES.length >= 30);

console.log(failed === 0 ? "All order-3 reconstruction checks passed." : `${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
