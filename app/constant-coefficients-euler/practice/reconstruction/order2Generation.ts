import { MAX_GENERATION_ATTEMPTS } from "../../constants";
import {
  flattenGivenSolutionExpressions,
  formatGivenSolutionExpressionsLatex,
  validateGivenSolutionExpressions,
} from "../../math/givenSolutionExpression";
import {
  analyzeReconstruction,
  analyzeReconstructionFeasibilityFromExpressions,
  inferForcedRootGroupsFromExpressions,
  rootGroupsDegree,
} from "../../math/reconstruction";
import { mixSeed, SeededRandom } from "../random";
import { ORDER2_RECONSTRUCTION_TEMPLATES, getOrder2TemplateById } from "./templates/order2";
import {
  ORDER2_FALLBACK_TEMPLATE_ID,
  outcomeToCaseFilterOutcome,
  pickMixedOutcomeCategory,
  pickWeightedTemplate,
  templateMatchesCaseFilter,
  templateMatchesDifficulty,
  type Order2ReconstructionTemplate,
  type Order2TemplateParameters,
} from "./templates/shared";
import type {
  Difficulty,
  ReconstructionCaseFilter,
  ReconstructionQuestion,
  SolutionRootGroup,
} from "../../types";
import { numbersEqual } from "../../utils/formatting";

const ORDER = 2;
const MAX_TEMPLATE_PARAM_ATTEMPTS = 12;

function rootGroupsEqual(
  actual: readonly SolutionRootGroup[],
  expected: readonly SolutionRootGroup[],
): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  for (const spec of expected) {
    const match = actual.find((group) => {
      if (spec.kind === "real") {
        return (
          group.kind === "real" &&
          numbersEqual(group.real, spec.real) &&
          group.multiplicity === spec.multiplicity
        );
      }
      return (
        group.kind === "complex" &&
        numbersEqual(group.real, spec.real) &&
        numbersEqual(group.imagAbs, spec.imagAbs) &&
        group.multiplicity === spec.multiplicity
      );
    });
    if (!match) {
      return false;
    }
  }

  return true;
}

function assertOrder2AnalysisMatchesTemplate(
  template: Order2ReconstructionTemplate,
  params: Order2TemplateParameters,
  analysis: ReturnType<typeof analyzeReconstruction>,
): boolean {
  const expectedOutcome = outcomeToCaseFilterOutcome(template.outcome);

  if (analysis.kind !== expectedOutcome) {
    return false;
  }

  if (expectedOutcome === "unique" && analysis.kind === "unique") {
    return rootGroupsDegree(analysis.forcedRoots) === ORDER;
  }

  if (expectedOutcome === "one-real-parameter" && analysis.kind === "one-real-parameter") {
    const expectedLambda = template.expectedLambdaConstraint?.(params);
    if (expectedLambda && analysis.lambdaConstraint !== expectedLambda) {
      return false;
    }
    return rootGroupsDegree(analysis.forcedRoots) === ORDER - 1;
  }

  if (expectedOutcome === "impossible" && analysis.kind === "impossible") {
    const expectedReason = template.expectedInfeasibilityReason?.(params);
    return expectedReason ? analysis.reason === expectedReason : true;
  }

  return true;
}

function verifyInstantiatedTemplate(
  template: Order2ReconstructionTemplate,
  params: Order2TemplateParameters,
  seed: number,
): { ok: true } | { ok: false; reason: string } {
  if (!template.validateParameters(params)) {
    return { ok: false, reason: "parameter validation failed" };
  }

  const givenSolutionExpressions = template.givenSolutions(params);
  if (!validateGivenSolutionExpressions(givenSolutionExpressions)) {
    return { ok: false, reason: "invalid given solution expressions" };
  }

  const behaviorCondition = template.behaviorCondition(params);
  const inferredRoots = inferForcedRootGroupsFromExpressions(givenSolutionExpressions);
  const declaredRoots = template.declaredForcedRoots(params);

  if (!rootGroupsEqual(inferredRoots, declaredRoots)) {
    return {
      ok: false,
      reason: `declared roots mismatch: inferred=${JSON.stringify(inferredRoots)} declared=${JSON.stringify(declaredRoots)}`,
    };
  }

  const analysis = analyzeReconstruction({
    equationKind: "constant-coefficients",
    order: ORDER,
    givenSolutions: flattenGivenSolutionExpressions(givenSolutionExpressions),
    behaviorCondition,
  });

  if (!assertOrder2AnalysisMatchesTemplate(template, params, analysis)) {
    return {
      ok: false,
      reason: `analysis mismatch: kind=${analysis.kind} template=${template.id} seed=${seed} params=${JSON.stringify(params)}`,
    };
  }

  const givenSolutions = flattenGivenSolutionExpressions(givenSolutionExpressions);
  const latexList = formatGivenSolutionExpressionsLatex(givenSolutionExpressions);
  if (latexList.some((latex) => latex.includes("-0") || latex.includes("+ -"))) {
    return { ok: false, reason: "invalid latex formatting" };
  }

  if (givenSolutions.length === 0) {
    return { ok: false, reason: "empty given solutions" };
  }

  return { ok: true };
}

function buildQuestionFromTemplate(
  seed: number,
  difficulty: Difficulty,
  template: Order2ReconstructionTemplate,
  params: Order2TemplateParameters,
): ReconstructionQuestion {
  const givenSolutionExpressions = template.givenSolutions(params);
  const givenSolutions = flattenGivenSolutionExpressions(givenSolutionExpressions);
  const behaviorCondition = template.behaviorCondition(params);
  const analysis = analyzeReconstruction({
    equationKind: "constant-coefficients",
    order: ORDER,
    givenSolutions: flattenGivenSolutionExpressions(givenSolutionExpressions),
    behaviorCondition,
  });

  const feasibilityAnalysis = analyzeReconstructionFeasibilityFromExpressions({
    order: ORDER,
    givenSolutionExpressions,
    behaviorCondition,
  });

  return {
    seed,
    equationKind: "constant-coefficients",
    order: ORDER,
    difficulty,
    givenSolutionExpressions,
    givenSolutions,
    givenSolutionsLatex: formatGivenSolutionExpressionsLatex(givenSolutionExpressions),
    behaviorCondition,
    expectedForcedRoots: analysis.forcedRoots,
    feasibilityAnalysis,
    analysis,
    templateId: template.id,
  };
}

function filterTemplates(
  caseFilter: ReconstructionCaseFilter,
  difficulty: Difficulty,
  targetOutcome?: ReturnType<typeof outcomeToCaseFilterOutcome>,
): Order2ReconstructionTemplate[] {
  return ORDER2_RECONSTRUCTION_TEMPLATES.filter((template) => {
    if (!templateMatchesCaseFilter(template, caseFilter)) {
      return false;
    }
    if (!templateMatchesDifficulty(template, difficulty)) {
      return false;
    }
    if (targetOutcome && outcomeToCaseFilterOutcome(template.outcome) !== targetOutcome) {
      return false;
    }
    return true;
  });
}

function instantiateTemplateWithRetries(
  template: Order2ReconstructionTemplate,
  seed: number,
  difficulty: Difficulty,
  rng: SeededRandom,
): ReconstructionQuestion | null {
  for (let attempt = 0; attempt < MAX_TEMPLATE_PARAM_ATTEMPTS; attempt += 1) {
    const params = template.sampleParameters(rng);
    const verification = verifyInstantiatedTemplate(template, params, seed);
    if (!verification.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[order2-template] ${template.id} rejected: ${verification.reason} seed=${seed}`,
        );
      }
      continue;
    }
    return buildQuestionFromTemplate(seed, difficulty, template, params);
  }
  return null;
}

function deterministicFallbackQuestion(seed: number, difficulty: Difficulty): ReconstructionQuestion {
  const template = getOrder2TemplateById(ORDER2_FALLBACK_TEMPLATE_ID);
  if (!template) {
    throw new Error("Order-2 fallback template is missing.");
  }
  const params = { realRootA: 2 };
  const verification = verifyInstantiatedTemplate(template, params, seed);
  if (!verification.ok) {
    throw new Error(`Order-2 fallback template failed verification: ${verification.reason}`);
  }
  return buildQuestionFromTemplate(seed, difficulty, template, params);
}

export function buildOrder2ConstantCoefficientQuestion(params: {
  seed: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
  attempt: number;
}): ReconstructionQuestion {
  const attemptSeed = mixSeed(params.seed, 0xecc00000 + params.attempt);
  const rng = new SeededRandom(mixSeed(attemptSeed, 0x104140));

  const targetOutcome =
    params.caseFilter === "mixed" ? pickMixedOutcomeCategory(rng) : params.caseFilter;

  let pool = filterTemplates(params.caseFilter, params.difficulty, targetOutcome);

  if (pool.length === 0) {
    pool = filterTemplates(params.caseFilter, params.difficulty);
  }

  if (pool.length === 0) {
    pool = filterTemplates("mixed", params.difficulty, targetOutcome);
  }

  if (pool.length === 0) {
    return deterministicFallbackQuestion(attemptSeed, params.difficulty);
  }

  const tried = new Set<string>();
  for (let selectionAttempt = 0; selectionAttempt < MAX_TEMPLATE_PARAM_ATTEMPTS; selectionAttempt += 1) {
    const remaining = pool.filter((template) => !tried.has(template.id));
    const candidatePool = remaining.length > 0 ? remaining : pool;
    const template = pickWeightedTemplate(rng, candidatePool);
    tried.add(template.id);

    const question = instantiateTemplateWithRetries(template, attemptSeed, params.difficulty, rng);
    if (question) {
      return question;
    }
  }

  return deterministicFallbackQuestion(attemptSeed, params.difficulty);
}

export function buildOrder2ReconstructionQuestion(params: {
  seed: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
}): ReconstructionQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const question = buildOrder2ConstantCoefficientQuestion({ ...params, attempt });
    if (question.templateId) {
      return question;
    }
  }
  return deterministicFallbackQuestion(params.seed, params.difficulty);
}

export function verifyAllOrder2Templates(): Array<{ templateId: string; ok: boolean; reason?: string }> {
  const rng = new SeededRandom(1);
  return ORDER2_RECONSTRUCTION_TEMPLATES.map((template) => {
    const params = template.sampleParameters(rng);
    const verification = verifyInstantiatedTemplate(template, params, 1);
    return {
      templateId: template.id,
      ok: verification.ok,
      reason: verification.ok ? undefined : verification.reason,
    };
  });
}

export {
  verifyInstantiatedTemplate,
  rootGroupsEqual,
  assertOrder2AnalysisMatchesTemplate,
};
