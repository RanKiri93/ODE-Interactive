import { MAX_GENERATION_ATTEMPTS } from "../../constants";
import {
  deriveTwoParameterDomains,
  extractSingleForcedRealRoot,
  twoParameterDomainsAreAdmissible,
} from "../../math/parameterDomains";
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
import { ORDER3_RECONSTRUCTION_TEMPLATES, getOrder3TemplateById } from "./templates/order3";
import {
  ORDER3_FALLBACK_TEMPLATE_ID,
  order3OutcomeToCaseFilterOutcome,
  order3TemplateMatchesCaseFilter,
  order3TemplateMatchesDifficulty,
  pickMixedOutcomeCategoryOrder3,
  pickWeightedTemplate,
  type Order3ReconstructionTemplate,
  type Order3TemplateParameters,
} from "./templates/shared";
import type {
  Difficulty,
  ReconstructionCaseFilter,
  ReconstructionQuestion,
  SolutionRootGroup,
} from "../../types";
import { numbersEqual } from "../../utils/formatting";

const ORDER = 3;
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

function assertOrder3AnalysisMatchesTemplate(
  template: Order3ReconstructionTemplate,
  params: Order3TemplateParameters,
  analysis: ReturnType<typeof analyzeReconstruction>,
): boolean {
  const expectedOutcome = order3OutcomeToCaseFilterOutcome(template.outcome);

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

  if (expectedOutcome === "two-parameter" && analysis.kind === "two-parameter") {
    const expectedReal = template.expectedRealPairDomain?.(params);
    const expectedComplex = template.expectedComplexPairDomain?.(params);
    if (expectedReal && analysis.realPairDomain !== expectedReal) {
      return false;
    }
    if (
      expectedComplex &&
      (analysis.complexPairDomain.alphaConstraint !== expectedComplex.alphaConstraint ||
        analysis.complexPairDomain.betaConstraint !== expectedComplex.betaConstraint)
    ) {
      return false;
    }
    return rootGroupsDegree(analysis.forcedRoots) === ORDER - 2;
  }

  if (expectedOutcome === "impossible" && analysis.kind === "impossible") {
    const expectedReason = template.expectedInfeasibilityReason?.(params);
    return expectedReason ? analysis.reason === expectedReason : true;
  }

  return true;
}

function verifyInstantiatedOrder3Template(
  template: Order3ReconstructionTemplate,
  params: Order3TemplateParameters,
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

  if (!assertOrder3AnalysisMatchesTemplate(template, params, analysis)) {
    return {
      ok: false,
      reason: `analysis mismatch: kind=${analysis.kind} template=${template.id} seed=${seed} params=${JSON.stringify(params)}`,
    };
  }

  if (analysis.kind === "two-parameter") {
    const forcedDegree = rootGroupsDegree(analysis.forcedRoots);
    const forcedRoot = extractSingleForcedRealRoot(analysis.forcedRoots);
    const domains = deriveTwoParameterDomains(analysis.forcedRoots, behaviorCondition);
    if (forcedDegree !== 1) {
      return {
        ok: false,
        reason: `two-parameter requires forced degree 1: template=${template.id} seed=${seed} forcedDegree=${forcedDegree}`,
      };
    }
    if (forcedRoot === null) {
      return {
        ok: false,
        reason: `two-parameter requires a single real forced root: template=${template.id} seed=${seed}`,
      };
    }
    if (!twoParameterDomainsAreAdmissible(domains)) {
      return {
        ok: false,
        reason:
          `two-parameter branch domain empty: template=${template.id} seed=${seed} ` +
          `forcedRoot=${forcedRoot} behavior=${behaviorCondition} ` +
          `realDomain=${domains.realPairDomain} complexDomain=${JSON.stringify(domains.complexPairDomain)}`,
      };
    }
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
  template: Order3ReconstructionTemplate,
  params: Order3TemplateParameters,
): ReconstructionQuestion {
  const givenSolutionExpressions = template.givenSolutions(params);
  const givenSolutions = flattenGivenSolutionExpressions(givenSolutionExpressions);
  const behaviorCondition = template.behaviorCondition(params);
  const analysis = analyzeReconstruction({
    equationKind: "constant-coefficients",
    order: ORDER,
    givenSolutions,
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
  targetOutcome?: ReturnType<typeof order3OutcomeToCaseFilterOutcome>,
): Order3ReconstructionTemplate[] {
  return ORDER3_RECONSTRUCTION_TEMPLATES.filter((template) => {
    if (!order3TemplateMatchesCaseFilter(template, caseFilter)) {
      return false;
    }
    if (!order3TemplateMatchesDifficulty(template, difficulty)) {
      return false;
    }
    if (targetOutcome && order3OutcomeToCaseFilterOutcome(template.outcome) !== targetOutcome) {
      return false;
    }
    return true;
  });
}

function instantiateTemplateWithRetries(
  template: Order3ReconstructionTemplate,
  seed: number,
  difficulty: Difficulty,
  rng: SeededRandom,
): ReconstructionQuestion | null {
  for (let attempt = 0; attempt < MAX_TEMPLATE_PARAM_ATTEMPTS; attempt += 1) {
    const params = template.sampleParameters(rng);
    const verification = verifyInstantiatedOrder3Template(template, params, seed);
    if (!verification.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[order3-template] ${template.id} rejected: ${verification.reason} seed=${seed}`,
        );
      }
      continue;
    }
    return buildQuestionFromTemplate(seed, difficulty, template, params);
  }
  return null;
}

function deterministicFallbackQuestion(seed: number, difficulty: Difficulty): ReconstructionQuestion {
  const template = getOrder3TemplateById(ORDER3_FALLBACK_TEMPLATE_ID);
  if (!template) {
    throw new Error("Order-3 fallback template is missing.");
  }
  const params = { realRootA: 1, realRootB: -2 };
  const verification = verifyInstantiatedOrder3Template(template, params, seed);
  if (!verification.ok) {
    throw new Error(`Order-3 fallback template failed verification: ${verification.reason}`);
  }
  return buildQuestionFromTemplate(seed, difficulty, template, params);
}

export function buildOrder3ConstantCoefficientQuestion(params: {
  seed: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
  attempt: number;
}): ReconstructionQuestion {
  const attemptSeed = mixSeed(params.seed, 0xecc00000 + params.attempt);
  const rng = new SeededRandom(mixSeed(attemptSeed, 0x104140));

  const targetOutcome =
    params.caseFilter === "mixed" ? pickMixedOutcomeCategoryOrder3(rng) : params.caseFilter;

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

export function buildOrder3ReconstructionQuestion(params: {
  seed: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
}): ReconstructionQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const question = buildOrder3ConstantCoefficientQuestion({ ...params, attempt });
    if (question.templateId) {
      return question;
    }
  }
  return deterministicFallbackQuestion(params.seed, params.difficulty);
}

export function verifyAllOrder3Templates(): Array<{ templateId: string; ok: boolean; reason?: string }> {
  const rng = new SeededRandom(1);
  return ORDER3_RECONSTRUCTION_TEMPLATES.map((template) => {
    const params = template.sampleParameters(rng);
    const verification = verifyInstantiatedOrder3Template(template, params, 1);
    return {
      templateId: template.id,
      ok: verification.ok,
      reason: verification.ok ? undefined : verification.reason,
    };
  });
}

export {
  verifyInstantiatedOrder3Template,
  rootGroupsEqual,
  assertOrder3AnalysisMatchesTemplate,
};
