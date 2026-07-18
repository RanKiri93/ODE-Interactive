import { MAX_GENERATION_ATTEMPTS } from "../constants";
import {
  flattenGivenSolutionExpressions,
  formatGivenSolutionExpressionsLatex,
} from "../math/givenSolutionExpression";
import { formatBasisTokenPreview } from "../math/basis";
import {
  analyzeReconstruction,
  analyzeReconstructionFeasibility,
  rootGroupsDegree,
  witnessTokensFromRootGroups,
} from "../math/reconstruction";
import { buildOrder2ConstantCoefficientQuestion } from "./reconstruction/order2Generation";
import { generateRootGroups } from "./questionGeneration";
import { mixSeed, SeededRandom } from "./random";
import type {
  BasisToken,
  Difficulty,
  EquationKind,
  GivenSolutionExpression,
  ReconstructionBehaviorCondition,
  ReconstructionCaseFilter,
  ReconstructionOutcome,
  ReconstructionQuestion,
  SolutionRootGroup,
} from "../types";

function tokensToExpressions(tokens: BasisToken[]): GivenSolutionExpression[] {
  return tokens.map((token) => ({ kind: "basis-token", token }));
}

function pickOutcome(
  rng: SeededRandom,
  caseFilter: ReconstructionCaseFilter,
): ReconstructionOutcome {
  if (caseFilter !== "mixed") {
    return caseFilter;
  }
  const roll = rng.integer(0, 2);
  return roll === 0 ? "unique" : roll === 1 ? "one-real-parameter" : "impossible";
}

function pickBehavior(
  rng: SeededRandom,
  difficulty: Difficulty,
  outcome: ReconstructionOutcome,
): ReconstructionBehaviorCondition {
  if (outcome === "impossible") {
    const useBehavior = rng.next() < (difficulty === "easy" ? 0.35 : 0.55);
    if (!useBehavior) {
      return "none";
    }
    return rng.next() < 0.5 ? "bounded-plus-infinity" : "decay-plus-infinity";
  }

  if (outcome === "one-real-parameter" && difficulty !== "easy") {
    const roll = rng.next();
    if (roll < 0.35) {
      return "none";
    }
    if (roll < 0.7) {
      return "bounded-plus-infinity";
    }
    return "decay-plus-infinity";
  }

  if (outcome === "unique" && difficulty === "hard" && rng.next() < 0.25) {
    return rng.next() < 0.5 ? "bounded-plus-infinity" : "decay-plus-infinity";
  }

  return "none";
}

function generateUniqueRootGroups(
  order: number,
  difficulty: Difficulty,
  rng: SeededRandom,
): SolutionRootGroup[] {
  return generateRootGroups(order, difficulty, rng);
}

function generateOneParameterRootGroups(
  order: number,
  difficulty: Difficulty,
  rng: SeededRandom,
): SolutionRootGroup[] {
  return generateRootGroups(order - 1, difficulty, rng);
}

function generateDegreeContradictionTokens(order: number, difficulty: Difficulty): BasisToken[] {
  if (order <= 3) {
    return [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 1 }];
  }

  if (difficulty === "hard") {
    return [
      { kind: "complex-cos", real: 0, imagAbs: 1, power: 1 },
      { kind: "real", real: -1, power: 0 },
    ];
  }

  return [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 2 }];
}

function generateBehaviorContradictionTokens(
  behavior: ReconstructionBehaviorCondition,
  equationKind: EquationKind,
  difficulty: Difficulty,
  rng: SeededRandom,
): BasisToken[] {
  if (behavior === "decay-plus-infinity" || behavior === "decay-minus-infinity") {
    if (equationKind === "euler" && difficulty !== "easy" && rng.next() < 0.4) {
      return [{ kind: "real", real: 2, power: 0 }];
    }
    return [{ kind: "complex-cos", real: 0, imagAbs: 1, power: 0 }];
  }

  if (equationKind === "euler") {
    return [{ kind: "real", real: 0, power: 1 }];
  }

  if (rng.next() < 0.5) {
    return [{ kind: "real", real: 0, power: 1 }];
  }

  return [{ kind: "complex-sin", real: 0, imagAbs: 1, power: 0 }];
}

function buildQuestionCore(
  seed: number,
  equationKind: EquationKind,
  order: number,
  difficulty: Difficulty,
  givenSolutionExpressions: GivenSolutionExpression[],
  behaviorCondition: ReconstructionBehaviorCondition,
  templateId?: string,
): ReconstructionQuestion {
  const givenSolutions = flattenGivenSolutionExpressions(givenSolutionExpressions);
  const analysis = analyzeReconstruction({
    equationKind,
    order,
    givenSolutions,
    behaviorCondition,
  });
  const feasibilityAnalysis = analyzeReconstructionFeasibility({
    order,
    givenSolutions,
    behaviorCondition,
  });

  const displayKind = equationKind === "euler" ? "euler" : "constant-coefficients";
  const expressionLatex = formatGivenSolutionExpressionsLatex(givenSolutionExpressions);
  const tokenLatex = givenSolutions.map((token) => formatBasisTokenPreview(token, displayKind));

  return {
    seed,
    equationKind,
    order,
    difficulty,
    givenSolutionExpressions,
    givenSolutions,
    givenSolutionsLatex:
      expressionLatex.length > 0 &&
      givenSolutionExpressions.some((expression) => expression.kind === "linear-combination")
        ? expressionLatex
        : tokenLatex,
    behaviorCondition,
    expectedForcedRoots: analysis.forcedRoots,
    feasibilityAnalysis,
    analysis,
    templateId,
  };
}

function tryGenerateLegacy(params: {
  seed: number;
  equationKind: EquationKind;
  order: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
  attempt: number;
}): ReconstructionQuestion | null {
  const attemptSeed = mixSeed(params.seed, 0xecc00000 + params.attempt);
  const rng = new SeededRandom(mixSeed(attemptSeed, 0x104140));
  const targetOutcome = pickOutcome(rng, params.caseFilter);
  const behaviorCondition = pickBehavior(rng, params.difficulty, targetOutcome);
  const fullLadder = params.difficulty === "easy" || rng.next() < 0.65;

  let givenSolutions: BasisToken[] = [];

  if (targetOutcome === "unique") {
    const groups = generateUniqueRootGroups(params.order, params.difficulty, rng);
    givenSolutions = witnessTokensFromRootGroups(groups, { fullLadder });
  } else if (targetOutcome === "one-real-parameter") {
    const groups = generateOneParameterRootGroups(params.order, params.difficulty, rng);
    givenSolutions = witnessTokensFromRootGroups(groups, { fullLadder });
  } else if (behaviorCondition === "none") {
    givenSolutions = generateDegreeContradictionTokens(params.order, params.difficulty);
  } else {
    givenSolutions = generateBehaviorContradictionTokens(
      behaviorCondition,
      params.equationKind,
      params.difficulty,
      rng,
    );
  }

  const question = buildQuestionCore(
    attemptSeed,
    params.equationKind,
    params.order,
    params.difficulty,
    tokensToExpressions(givenSolutions),
    behaviorCondition,
  );

  if (question.analysis.kind !== targetOutcome) {
    return null;
  }

  if (targetOutcome === "unique" && rootGroupsDegree(question.expectedForcedRoots) !== params.order) {
    return null;
  }

  if (
    targetOutcome === "one-real-parameter" &&
    rootGroupsDegree(question.expectedForcedRoots) !== params.order - 1
  ) {
    return null;
  }

  return question;
}

function fallbackQuestion(
  seed: number,
  equationKind: EquationKind,
  order: number,
  difficulty: Difficulty,
): ReconstructionQuestion {
  const givenSolutions: BasisToken[] = [
    { kind: "complex-cos", real: 0, imagAbs: 1, power: 0 },
    { kind: "complex-sin", real: 0, imagAbs: 1, power: 1 },
  ];

  return buildQuestionCore(
    seed,
    equationKind,
    order,
    difficulty,
    tokensToExpressions(givenSolutions),
    "none",
  );
}

export function buildReconstructionQuestion(params: {
  seed: number;
  equationKind: EquationKind;
  order: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
}): ReconstructionQuestion {
  if (params.equationKind === "constant-coefficients" && params.order === 2) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const question = buildOrder2ConstantCoefficientQuestion({ ...params, attempt });
      if (question) {
        return question;
      }
    }
    return buildOrder2ConstantCoefficientQuestion({ ...params, attempt: 0 });
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const question = tryGenerateLegacy({ ...params, attempt });
    if (question) {
      return question;
    }
  }

  return fallbackQuestion(params.seed, params.equationKind, params.order, params.difficulty);
}

export function generateReconstructionQuestion(params: {
  seed: number;
  equationKind: EquationKind;
  order: number;
  difficulty: Difficulty;
  caseFilter: ReconstructionCaseFilter;
}): ReconstructionQuestion {
  return buildReconstructionQuestion(params);
}
