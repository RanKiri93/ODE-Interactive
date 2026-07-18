import { analyzeReconstruction, deriveLambdaConstraint } from "../app/constant-coefficients-euler/math/reconstruction";
import { buildReconstructionQuestion } from "../app/constant-coefficients-euler/practice/reconstructionQuestionGeneration";
import {
  ORDER2_RECONSTRUCTION_TEMPLATES,
  getOrder2TemplateById,
} from "../app/constant-coefficients-euler/practice/reconstruction/templates/order2";
import {
  rootGroupsEqual,
  verifyAllOrder2Templates,
  verifyInstantiatedTemplate,
} from "../app/constant-coefficients-euler/practice/reconstruction/order2Generation";
import { SeededRandom } from "../app/constant-coefficients-euler/practice/random";
import type {
  BasisToken,
  LambdaConstraint,
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

for (const result of verifyAllOrder2Templates()) {
  assert(`template-${result.templateId}`, result.ok);
  if (!result.ok && result.reason) {
    console.log("  ", result.reason);
  }
}

const manualCases: Array<{
  name: string;
  templateId: string;
  params: Record<string, number | boolean>;
  expectedKind: "unique" | "one-real-parameter" | "impossible";
  expectedLambda?: LambdaConstraint;
  expectedReason?: ReconstructionImpossibleReason;
  expectedPoly?: number[];
}> = [
  {
    name: "CaseA-simple-real-root",
    templateId: "O2-F01",
    params: { realRootA: 2 },
    expectedKind: "one-real-parameter",
    expectedLambda: "all-real",
  },
  {
    name: "CaseB-repeated-root",
    templateId: "O2-F02-easy",
    params: { realRootA: -1 },
    expectedKind: "unique",
    expectedPoly: [1, 2, 1],
  },
  {
    name: "CaseC-complex-pair",
    templateId: "O2-F03-pure",
    params: { complexRealPart: 1, frequency: 2, useCosine: true },
    expectedKind: "unique",
    expectedPoly: [5, -2, 1],
  },
  {
    name: "CaseD-two-real-combination",
    templateId: "O2-F04-combination",
    params: { realRootA: -1, realRootB: 2, coefficientA: 2, coefficientB: -1 },
    expectedKind: "unique",
    expectedPoly: [-2, -1, 1],
  },
  {
    name: "CaseE-bounded-plus",
    templateId: "O2-F05",
    params: { realRootA: -2 },
    expectedKind: "one-real-parameter",
    expectedLambda: "non-positive",
  },
  {
    name: "CaseF-zero-collision-plus",
    templateId: "O2-F06",
    params: { realRootA: 0 },
    expectedKind: "one-real-parameter",
    expectedLambda: "negative",
  },
  {
    name: "CaseG-zero-collision-minus",
    templateId: "O2-F08",
    params: { realRootA: 0 },
    expectedKind: "one-real-parameter",
    expectedLambda: "positive",
  },
  {
    name: "CaseH-decay-minus",
    templateId: "O2-F10",
    params: { realRootA: 2 },
    expectedKind: "one-real-parameter",
    expectedLambda: "positive",
  },
  {
    name: "CaseI-degree-contradiction",
    templateId: "O2-I04",
    params: { realRootA: 1, realRootB: -1 },
    expectedKind: "impossible",
    expectedReason: "forced-degree-exceeds-order",
  },
  {
    name: "CaseJ-behavior-contradiction-decay-plus",
    templateId: "O2-I14",
    params: { frequency: 1, useCosine: true },
    expectedKind: "impossible",
    expectedReason: "given-solution-does-not-decay-plus-infinity",
  },
  {
    name: "CaseK-repeated-zero-bounded-minus",
    templateId: "O2-I13",
    params: {},
    expectedKind: "impossible",
    expectedReason: "given-solution-unbounded-minus-infinity",
  },
];

for (const spec of manualCases) {
  const template = getOrder2TemplateById(spec.templateId);
  if (!template) {
    assert(`${spec.name}-template-exists`, false);
    continue;
  }

  const verification = verifyInstantiatedTemplate(template, spec.params, 0);
  assert(`${spec.name}-instantiation`, verification.ok);

  const expressions = template.givenSolutions(spec.params);
  const tokens: BasisToken[] = expressions.flatMap((expression) =>
    expression.kind === "basis-token"
      ? [expression.token]
      : expression.terms.map((term: { token: BasisToken }) => term.token),
  );
  const analysis = analyzeReconstruction({
    equationKind: "constant-coefficients",
    order: 2,
    givenSolutions: tokens,
    behaviorCondition: template.behaviorCondition(spec.params),
  });

  assert(`${spec.name}-kind`, analysis.kind === spec.expectedKind);

  if (spec.expectedLambda && analysis.kind === "one-real-parameter") {
    assert(`${spec.name}-lambda`, analysis.lambdaConstraint === spec.expectedLambda);
  }

  if (spec.expectedReason && analysis.kind === "impossible") {
    assert(`${spec.name}-reason`, analysis.reason === spec.expectedReason);
  }

  if (spec.expectedPoly && analysis.kind === "unique") {
    assert(
      `${spec.name}-poly`,
      analysis.polynomialCoefficients.every((value, index) =>
        numbersEqual(value, spec.expectedPoly![index] ?? NaN),
      ),
    );
  }
}

const declaredRootsOk = rootGroupsEqual(
  getOrder2TemplateById("O2-F04-combination")!.declaredForcedRoots({
    realRootA: -1,
    realRootB: 2,
    coefficientA: 2,
    coefficientB: -1,
  }),
  [
    { kind: "real", real: -1, multiplicity: 1 },
    { kind: "real", real: 2, multiplicity: 1 },
  ],
);
assert("declared-roots-two-real-combination", declaredRootsOk);

const zeroCollisionPlus = deriveLambdaConstraint(
  [{ kind: "real", real: 0, multiplicity: 1 }],
  "bounded-plus-infinity",
);
const zeroCollisionMinus = deriveLambdaConstraint(
  [{ kind: "real", real: 0, multiplicity: 1 }],
  "bounded-minus-infinity",
);
assert("zero-collision-plus-lambda", zeroCollisionPlus === "negative");
assert("zero-collision-minus-lambda", zeroCollisionMinus === "positive");

const q1 = buildReconstructionQuestion({
  seed: 42,
  equationKind: "constant-coefficients",
  order: 2,
  difficulty: "medium",
  caseFilter: "mixed",
});
const q2 = buildReconstructionQuestion({
  seed: 42,
  equationKind: "constant-coefficients",
  order: 2,
  difficulty: "medium",
  caseFilter: "mixed",
});
assert(
  "determinism-same-seed",
  q1.templateId === q2.templateId &&
    q1.givenSolutionsLatex.join("|") === q2.givenSolutionsLatex.join("|"),
);

const mixedOutcomes = new Set<string>();
for (let seed = 1; seed <= 60; seed += 1) {
  const question = buildReconstructionQuestion({
    seed,
    equationKind: "constant-coefficients",
    order: 2,
    difficulty: "hard",
    caseFilter: "mixed",
  });
  mixedOutcomes.add(question.analysis.kind);
}
assert("mixed-includes-unique", mixedOutcomes.has("unique"));
assert("mixed-includes-one-real-parameter", mixedOutcomes.has("one-real-parameter"));
assert("mixed-includes-impossible", mixedOutcomes.has("impossible"));

const rng = new SeededRandom(99);
for (const template of ORDER2_RECONSTRUCTION_TEMPLATES) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const params = template.sampleParameters(rng);
    assert(
      `${template.id}-nondegenerate-${attempt}`,
      template.validateParameters(params) && verifyInstantiatedTemplate(template, params, attempt).ok,
    );
  }
}

process.exit(failed > 0 ? 1 : 0);
